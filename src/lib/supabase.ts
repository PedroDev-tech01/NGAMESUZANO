import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

// Default verified credentials for the N! GAMES project
export const DEFAULT_SUPABASE_URL = 'https://frjmslrygksatugmjzot.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_2_qxvkQic5QCQP__wXxBYQ_r2UMfaTW';

// Known revoked or deprecated keys that should never be used
const KNOWN_INVALID_KEYS = new Set([
  'sb_secret_VoBzuy8ijWDIqTLLkmXJNg_VuiBEl4q',
]);

function isValidHttpUrl(str?: string): boolean {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanCandidateString(val?: string): string {
  if (!val) return '';
  let str = val.trim();
  // Remove wrapping quotes if present
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

function normalizeSupabaseUrl(rawUrl?: string): string {
  let url = cleanCandidateString(rawUrl);
  if (!url) return '';
  
  // If user entered a domain without protocol e.g. "frjmslrygksatugmjzot.supabase.co"
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('.supabase.') || url.includes('.')) {
      url = 'https://' + url;
    }
  }

  url = url.replace(/\/rest\/v1\/?$/, '');
  url = url.replace(/\/+$/, '');

  if (!isValidHttpUrl(url)) {
    return '';
  }

  return url;
}

function isValidSupabaseKey(key?: string): boolean {
  const clean = cleanCandidateString(key);
  if (!clean || clean.length < 15 || clean.includes(' ') || KNOWN_INVALID_KEYS.has(clean)) {
    return false;
  }
  return true;
}

export function isAuthOrKeyError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const hint = (error.hint || '').toLowerCase();
  const code = String(error.code || error.status || '');
  return (
    msg.includes('unregistered api key') ||
    msg.includes('invalid api key') ||
    msg.includes('jwt') ||
    hint.includes('unregistered') ||
    code === '401' ||
    code === 'PGRST301'
  );
}

export function resetSupabaseClientToDefault(): void {
  try {
    supabaseClient = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] Client successfully reset to verified default credentials.');
  } catch (err) {
    console.warn('[Supabase] Failed to reset client to default:', err);
  }
}

function getSafeEnvVar(key: string): string | undefined {
  // 1. Vite browser environment (Netlify, Vercel, client build)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const viteVal = (import.meta as any).env[key] || (import.meta as any).env[`VITE_${key}`];
      if (viteVal && typeof viteVal === 'string') return viteVal;
    }
  } catch {
    // ignore
  }

  // 2. Node.js environment (server.ts)
  try {
    if (typeof process !== 'undefined' && process.env) {
      const nodeVal = process.env[key] || process.env[`VITE_${key}`];
      if (nodeVal && typeof nodeVal === 'string') return nodeVal;
    }
  } catch {
    // ignore
  }

  return undefined;
}

export function resolveSupabaseCredentials(): { url: string; key: string } | null {
  // Try environment variables first (checking both process.env and Vite import.meta.env)
  const envUrlCandidate = normalizeSupabaseUrl(getSafeEnvVar('SUPABASE_URL'));
  
  const envKeyCandidate = [
    cleanCandidateString(getSafeEnvVar('SUPABASE_PUBLISHABLE_KEY')),
    cleanCandidateString(getSafeEnvVar('SUPABASE_ANON_KEY')),
    cleanCandidateString(getSafeEnvVar('SUPABASE_KEY')),
    cleanCandidateString(getSafeEnvVar('SUPABASE_SERVICE_ROLE_KEY')),
    cleanCandidateString(getSafeEnvVar('SUPABASE_SECRET_KEY')),
  ].find(isValidSupabaseKey);

  // If valid environment variables are present, use them
  if (envUrlCandidate && envKeyCandidate) {
    return { url: envUrlCandidate, key: envKeyCandidate };
  }

  // Fallback to default project credentials if available and valid
  if (isValidHttpUrl(DEFAULT_SUPABASE_URL) && isValidSupabaseKey(DEFAULT_SUPABASE_KEY)) {
    return {
      url: envUrlCandidate || DEFAULT_SUPABASE_URL,
      key: envKeyCandidate || DEFAULT_SUPABASE_KEY,
    };
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return resolveSupabaseCredentials() !== null;
}

export function getSupabase(): SupabaseClient | null {
  const credentials = resolveSupabaseCredentials();
  if (!credentials) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(credentials.url, credentials.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.error('[Supabase] Failed to initialize client:', err);
      return null;
    }
  }

  return supabaseClient;
}
