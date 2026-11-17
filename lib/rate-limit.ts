// Minimal in-memory rate limiting for the AI-backed API routes (公開ガード).
//
// Why in-memory: the public release must not ship with wide-open paid
// endpoints, and this needs zero new infrastructure. The limit is per
// server instance, so a determined attacker across many instances can
// exceed it — treat this as a blunt abuse brake, not a billing firewall.
// For production, back it with a shared store (Vercel KV / Upstash) and
// per-user quotas; see docs/public-guards.md.

interface WindowState {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowState>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (when blocked). */
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const state = windows.get(key);
  if (!state || now >= state.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (state.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((state.resetAt - now) / 1000) };
  }
  state.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/**
 * Best-effort client key from proxy headers. Preference order matters:
 * the platform-set header first (Vercel overwrites it and clients
 * cannot spoof it there), then the LAST x-forwarded-for entry (the one
 * appended by the closest proxy — earlier entries are client-supplied
 * and spoofable). Callers without any header share the 'unknown'
 * bucket; on the target platform every request carries one, so this
 * is a local-dev corner, documented in docs/public-guards.md.
 */
export function clientKey(req: Request): string {
  const vercel = req.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0]?.trim() || 'unknown';
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Guard one route: returns a 429 Response when the caller is over the
 * limit, or null to proceed.
 */
export function rateLimitGuard(
  req: Request,
  routeName: string,
  limit: number,
  windowMs = 60_000
): Response | null {
  const result = checkRateLimit(`${routeName}:${clientKey(req)}`, limit, windowMs);
  if (result.ok) return null;
  return new Response(
    JSON.stringify({
      error: 'リクエストが多すぎます。少し待ってからもう一度お試しください。',
      code: 'RATE_LIMITED',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSec),
      },
    }
  );
}
