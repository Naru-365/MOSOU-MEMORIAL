import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint. Returns whether GEMINI_API_KEY is visible to the
 * Node runtime function without leaking the value itself. Safe to keep
 * around but consider removing once the env wiring is confirmed.
 */
export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  const allEnvKeysWithG = Object.keys(process.env)
    .filter((k) => k.toUpperCase().startsWith('G'))
    .sort();

  return NextResponse.json({
    has_GEMINI_API_KEY: typeof key === 'string' && key.length > 0,
    GEMINI_API_KEY_length: typeof key === 'string' ? key.length : 0,
    GEMINI_API_KEY_starts_with: typeof key === 'string' ? key.slice(0, 4) : null,
    env_keys_starting_with_G: allEnvKeysWithG,
    vercel_env: process.env.VERCEL_ENV ?? null,
    vercel_url: process.env.VERCEL_URL ?? null,
    vercel_branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    vercel_commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
