import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConnectionStatus {
  projectId: string;
  url: string;
  configured: boolean;
  restReachable: boolean;
  schemaReady: boolean;
  realtimeChannelStatus: string;
  serviceRoleConfigured: boolean;
  lastCheckedAt: string | null;
  detail: string;
}

export interface SupabaseSyncPayload {
  eventId: string;
  entity: string;
  action: string;
  recordId?: string;
  scope: 'public' | 'authenticated' | 'user-and-admin';
  targetUserId?: string;
  timestamp: string;
}

export class SupabaseRealtimeBridge {
  readonly projectId: string;
  readonly url: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
  readonly client: SupabaseClient | null = null;

  private channel: RealtimeChannel | null = null;
  private channelStatus = 'IDLE';
  private cachedProbe: {
    checkedAtMs: number;
    restReachable: boolean;
    schemaReady: boolean;
    detail: string;
  } | null = null;

  constructor() {
    this.projectId = (process.env.SUPABASE_PROJECT_ID || 'nhatdnidfwcsgzgwhedh').trim();
    this.url = (
      process.env.VITE_SUPABASE_URL || `https://${this.projectId}.supabase.co`
    ).trim();
    this.anonKey = (
      process.env.VITE_SUPABASE_ANON_KEY ||
      'sb_publishable_hetSjZ6dyMz-kPc4_TOZxA_DExUHkTw'
    ).trim();
    this.serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    if (this.url && this.anonKey) {
      const keyForServer = this.serviceRoleKey || this.anonKey;
      this.client = createClient(this.url, keyForServer, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 10 } },
      });
    }
  }

  connectRealtime(onRemoteEvent?: (payload: SupabaseSyncPayload) => void): void {
    if (!this.client || this.channel) return;
    this.channelStatus = 'CONNECTING';
    this.channel = this.client
      .channel('questionbank-sync', {
        config: {
          broadcast: { ack: false, self: false },
        },
      })
      .on('broadcast', { event: 'db:changed' }, (msg) => {
        const payload = msg.payload as SupabaseSyncPayload | undefined;
        if (payload && onRemoteEvent) {
          onRemoteEvent(payload);
        }
      })
      .subscribe((status) => {
        this.channelStatus = status;
      });
  }

  async broadcastSync(payload: SupabaseSyncPayload): Promise<void> {
    if (!this.channel || this.channelStatus !== 'SUBSCRIBED') return;
    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'db:changed',
        payload,
      });
    } catch {
      // Non-fatal: local WebSocket hub already delivers immediately
    }
  }

  async probeStatus(force = false): Promise<SupabaseConnectionStatus> {
    const now = Date.now();
    if (!force && this.cachedProbe && now - this.cachedProbe.checkedAtMs < 30_000) {
      return {
        projectId: this.projectId,
        url: this.url,
        configured: Boolean(this.url && this.anonKey),
        restReachable: this.cachedProbe.restReachable,
        schemaReady: this.cachedProbe.schemaReady,
        realtimeChannelStatus: this.channelStatus,
        serviceRoleConfigured: Boolean(this.serviceRoleKey),
        lastCheckedAt: new Date(this.cachedProbe.checkedAtMs).toISOString(),
        detail: this.cachedProbe.detail,
      };
    }

    let restReachable = false;
    let schemaReady = false;
    let detail = 'Supabase credentials missing';

    if (this.url && this.anonKey) {
      try {
        const authRes = await fetch(`${this.url}/auth/v1/settings`, {
          headers: { apikey: this.anonKey },
          signal: AbortSignal.timeout(4000),
        });
        restReachable = authRes.ok;

        if (restReachable) {
          const tableRes = await fetch(`${this.url}/rest/v1/classes?select=id&limit=1`, {
            headers: { apikey: this.anonKey },
            signal: AbortSignal.timeout(4000),
          });
          if (tableRes.ok) {
            schemaReady = true;
            detail = 'Supabase Auth, REST & Realtime schema active';
          } else {
            const body = await tableRes.text();
            schemaReady = false;
            detail = body.includes('PGRST205')
              ? 'Supabase Realtime & Auth connected; SQL migrations pending push to Postgres'
              : `Supabase REST reachable (${tableRes.status})`;
          }
        } else {
          detail = `Supabase Auth probe returned HTTP ${authRes.status}`;
        }
      } catch (err) {
        detail = err instanceof Error ? err.message : 'Supabase probe unreachable';
      }
    }

    this.cachedProbe = {
      checkedAtMs: now,
      restReachable,
      schemaReady,
      detail,
    };

    return {
      projectId: this.projectId,
      url: this.url,
      configured: Boolean(this.url && this.anonKey),
      restReachable,
      schemaReady,
      realtimeChannelStatus: this.channelStatus,
      serviceRoleConfigured: Boolean(this.serviceRoleKey),
      lastCheckedAt: new Date(now).toISOString(),
      detail,
    };
  }

  async close(): Promise<void> {
    if (this.channel && this.client) {
      try {
        await this.client.removeChannel(this.channel);
      } catch {
        // ignore cleanup error
      }
      this.channel = null;
      this.channelStatus = 'CLOSED';
    }
  }
}
