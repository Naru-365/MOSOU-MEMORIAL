'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser Supabase client. The anon key is public by design (protected by RLS),
// so it is safe to expose via NEXT_PUBLIC_*. Null when not configured.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseEnabled = Boolean(url && anonKey);
