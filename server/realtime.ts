import crypto from 'node:crypto';
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import type { UserProfile } from '../src/types/domain.ts';
import type { QuestionBankDatabase } from './db.ts';
import { SESSION_COOKIE_NAME, verifySignedSessionToken } from './security.ts';
import type { SupabaseRealtimeBridge } from './supabaseBridge.ts';

export type RealtimeScope = 'public' | 'authenticated' | 'user-and-admin';

export interface RealtimeMutationEvent {
  eventId: string;
  entity:
    | 'academic'
    | 'questions'
    | 'plans'
    | 'payment_methods'
    | 'payments'
    | 'subscriptions'
    | 'papers'
    | 'exports'
    | 'collections'
    | 'users'
    | 'cms'
    | 'system';
  action: string;
  recordId?: string;
  scope: RealtimeScope;
  targetUserId?: string;
  actorUserId?: string;
  decision?: 'approved' | 'rejected';
  summaryBn?: string;
  timestamp: string;
}

interface SocketClientMeta {
  clientId: string;
  userId: string | null;
  role: UserProfile['role'] | null;
  connectedAt: string;
  isAlive: boolean;
}

function parseRawCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(val);
  }
  return result;
}

export class RealtimeHub {
  private readonly db: QuestionBankDatabase;
  private readonly supabaseBridge?: SupabaseRealtimeBridge;
  private readonly wss: WebSocketServer;
  private readonly clients = new Map<WebSocket, SocketClientMeta>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private upgradeHandler: ((req: IncomingMessage, socket: Duplex, head: Buffer) => void) | null = null;
  private attachedServer: HttpServer | null = null;

  constructor(db: QuestionBankDatabase, supabaseBridge?: SupabaseRealtimeBridge) {
    this.db = db;
    this.supabaseBridge = supabaseBridge;
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws, req) => {
      const cookies = parseRawCookieHeader(req.headers.cookie);
      const rawToken = cookies[SESSION_COOKIE_NAME];
      const sessionId = rawToken ? verifySignedSessionToken(rawToken) : null;
      const user = sessionId ? this.db.getUserBySessionId(sessionId) : null;

      const meta: SocketClientMeta = {
        clientId: crypto.randomUUID(),
        userId: user?.id || null,
        role: user?.role || null,
        connectedAt: new Date().toISOString(),
        isAlive: true,
      };
      this.clients.set(ws, meta);

      ws.on('pong', () => {
        const entry = this.clients.get(ws);
        if (entry) entry.isAlive = true;
      });

      ws.on('message', (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: string };
          if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.broadcastPresence();
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });

      ws.send(
        JSON.stringify({
          type: 'connected',
          clientId: meta.clientId,
          authenticated: Boolean(meta.userId),
          userId: meta.userId,
          role: meta.role,
          onlineCount: this.clients.size,
          timestamp: new Date().toISOString(),
        })
      );

      this.broadcastPresence();
    });

    this.heartbeatTimer = setInterval(() => {
      for (const [ws, meta] of this.clients.entries()) {
        if (!meta.isAlive) {
          this.clients.delete(ws);
          ws.terminate();
          continue;
        }
        meta.isAlive = false;
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }, 25_000);
  }

  attachToServer(httpServer: HttpServer): void {
    this.attachedServer = httpServer;
    this.upgradeHandler = (req, socket, head) => {
      const reqPath = (req.url || '').split('?')[0];
      if (reqPath !== '/ws') {
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit('connection', ws, req);
      });
    };
    httpServer.on('upgrade', this.upgradeHandler);
  }

  getConnectedStats() {
    const activeUsers = new Set<string>();
    let adminCount = 0;
    for (const meta of this.clients.values()) {
      if (meta.userId) activeUsers.add(meta.userId);
      if (meta.role === 'admin') adminCount += 1;
    }
    return {
      totalConnections: this.clients.size,
      authenticatedUsers: activeUsers.size,
      adminConnections: adminCount,
    };
  }

  private broadcastPresence(): void {
    const stats = this.getConnectedStats();
    const frame = JSON.stringify({
      type: 'presence:update',
      ...stats,
      timestamp: new Date().toISOString(),
    });
    for (const [ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(frame);
      }
    }
  }

  broadcastMutation(
    input: Omit<RealtimeMutationEvent, 'eventId' | 'timestamp'>
  ): RealtimeMutationEvent {
    const event: RealtimeMutationEvent = {
      ...input,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const frame = JSON.stringify({
      type: 'db:changed',
      ...event,
    });

    for (const [ws, meta] of this.clients.entries()) {
      if (ws.readyState !== WebSocket.OPEN) continue;

      if (event.scope === 'public') {
        ws.send(frame);
        continue;
      }

      if (event.scope === 'authenticated') {
        if (meta.userId) {
          ws.send(frame);
        }
        continue;
      }

      // scope === 'user-and-admin' -> strictly isolate private records
      if (meta.role === 'admin' || (event.targetUserId && meta.userId === event.targetUserId)) {
        ws.send(frame);
      }
    }

    // Mirror safe public/non-sensitive sync notice into Supabase Realtime broadcast channel
    if (this.supabaseBridge) {
      void this.supabaseBridge.broadcastSync({
        eventId: event.eventId,
        entity: event.entity,
        action: event.action,
        recordId: event.recordId,
        scope: event.scope,
        targetUserId: event.targetUserId,
        timestamp: event.timestamp,
      });
    }

    return event;
  }

  async close(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.attachedServer && this.upgradeHandler) {
      this.attachedServer.off('upgrade', this.upgradeHandler);
      this.upgradeHandler = null;
    }
    for (const [ws] of this.clients.entries()) {
      try {
        ws.close();
      } catch {
        ws.terminate();
      }
    }
    this.clients.clear();
    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve());
    });
  }
}
