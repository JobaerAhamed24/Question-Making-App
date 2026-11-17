import crypto from 'node:crypto';
import type { Request } from 'express';

const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSecret(): string {
  return process.env.SESSION_SECRET || FALLBACK_SECRET;
}

export const SESSION_COOKIE_NAME = 'qb_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function signSessionToken(sessionId: string): string {
  const sig = crypto.createHmac('sha256', getSecret()).update(sessionId).digest('hex');
  return `${sessionId}.${sig}`;
}

export function verifySignedSessionToken(token: string): string | null {
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const sessionId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(sessionId).digest('hex');
  const bufSig = Buffer.from(sig, 'utf8');
  const bufExp = Buffer.from(expected, 'utf8');
  if (bufSig.length !== bufExp.length) return null;
  if (!crypto.timingSafeEqual(bufSig, bufExp)) return null;
  return sessionId;
}

export function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export interface SignedStoragePayload {
  objectId: string;
  userId: string;
  expiresAtMs: number;
}

export function signStorageToken(payload: SignedStoragePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyStorageToken(token: string): SignedStoragePayload | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  const bufA = Buffer.from(sig, 'utf8');
  const bufB = Buffer.from(expectedSig, 'utf8');
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedStoragePayload;
    if (!parsed.objectId || !parsed.expiresAtMs || Date.now() > parsed.expiresAtMs) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function generateUid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}
