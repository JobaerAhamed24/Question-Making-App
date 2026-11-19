import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env as ImportMetaEnv & {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

const FALLBACK_SUPABASE_URL = 'http://127.0.0.1:54321';
const FALLBACK_SUPABASE_KEY = 'missing-publishable-key';

function parseValidHttpUrl(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString().replace(/\/$/, '');
    }
    return '';
  } catch {
    return '';
  }
}

const rawSupabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_URL = parseValidHttpUrl(rawSupabaseUrl);
export const SUPABASE_PUBLISHABLE_KEY = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (!isSupabaseConfigured) {
  if (rawSupabaseUrl.trim() && !SUPABASE_URL) {
    console.warn(
      '[Supabase] Configured URL is not a valid HTTP/HTTPS URL; falling back to local seeded data store.'
    );
  } else {
    console.info('[Supabase] Not configured; using local seeded data store.');
  }
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || FALLBACK_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_KEY,
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
