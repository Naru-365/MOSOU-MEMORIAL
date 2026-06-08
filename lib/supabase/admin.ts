import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase admin client (Service Role).
 *
 * SECURITY: the Service Role key bypasses RLS. This module imports
 * `server-only` so it can never be bundled into client code. Use it ONLY from
 * route handlers running with `runtime = 'nodejs'`. Never expose the client or
 * its key to the browser.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

/** Returns the admin client, or null when Supabase env vars are not configured. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  if (cached) return cached;
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const LOOK_IMAGES_BUCKET = 'look-images';

let bucketEnsured = false;

/** Idempotently ensures the public look-images bucket exists. */
export async function ensureLookImagesBucket(client: SupabaseClient): Promise<void> {
  if (bucketEnsured) return;
  const { data } = await client.storage.getBucket(LOOK_IMAGES_BUCKET);
  if (!data) {
    await client.storage.createBucket(LOOK_IMAGES_BUCKET, {
      public: true,
      // Matches MAX_IMAGE_BYTES in app/api/looks/upload as a defense-in-depth cap.
      fileSizeLimit: '8MB',
    });
  }
  bucketEnsured = true;
}
