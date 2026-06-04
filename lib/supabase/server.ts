import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Public storage bucket that holds generated character look images. */
export const IMAGE_BUCKET = 'character-images';

/**
 * Service-role Supabase client for server-side use (API routes only).
 * Returns null when Supabase env vars are not configured, so callers can fall
 * back to the previous behavior (data URLs / localStorage) — the app keeps
 * working without Supabase.
 *
 * NEVER import this from client components: the service role key bypasses RLS.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
