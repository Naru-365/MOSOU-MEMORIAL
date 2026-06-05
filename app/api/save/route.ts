import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { SaveLoadResponse, SaveError } from '@/lib/api-types';

export const runtime = 'nodejs';

const SAVE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/; // require real entropy (UUID / 32-char fallback)
const MAX_SAVE_BYTES = 1024 * 1024; // 1MB; base64 images live in Storage, not here.

export async function GET(req: NextRequest) {
  const client = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json<SaveError>(
      { error: 'Supabase not configured', code: 'NO_SUPABASE' },
      { status: 503 }
    );
  }

  const saveId = req.nextUrl.searchParams.get('saveId') ?? '';
  if (!SAVE_ID_RE.test(saveId)) {
    return NextResponse.json<SaveError>(
      { error: 'Invalid saveId', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const { data, error } = await client
    .from('saves')
    .select('data, updated_at')
    .eq('id', saveId)
    .maybeSingle();

  if (error) {
    return NextResponse.json<SaveError>({ error: error.message, code: 'DB_FAILED' }, { status: 502 });
  }
  if (!data) {
    return NextResponse.json<SaveLoadResponse>({ found: false, data: null, updatedAt: null });
  }
  return NextResponse.json<SaveLoadResponse>({
    found: true,
    data: data.data,
    updatedAt: data.updated_at,
  });
}

export async function PUT(req: NextRequest) {
  const client = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json<SaveError>(
      { error: 'Supabase not configured', code: 'NO_SUPABASE' },
      { status: 503 }
    );
  }

  let body: { saveId?: string; data?: unknown };
  try {
    body = (await req.json()) as { saveId?: string; data?: unknown };
  } catch {
    return NextResponse.json<SaveError>({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, { status: 400 });
  }

  const saveId = body.saveId ?? '';
  if (!SAVE_ID_RE.test(saveId)) {
    return NextResponse.json<SaveError>({ error: 'Invalid saveId', code: 'BAD_REQUEST' }, { status: 400 });
  }
  if (body.data == null || typeof body.data !== 'object') {
    return NextResponse.json<SaveError>({ error: 'data object is required', code: 'BAD_REQUEST' }, { status: 400 });
  }

  const serialized = JSON.stringify(body.data);
  if (serialized.length > MAX_SAVE_BYTES) {
    return NextResponse.json<SaveError>(
      { error: 'Save payload too large (images belong in Storage)', code: 'TOO_LARGE' },
      { status: 413 }
    );
  }

  const { error } = await client.from('saves').upsert({
    id: saveId,
    data: body.data,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json<SaveError>({ error: error.message, code: 'DB_FAILED' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
