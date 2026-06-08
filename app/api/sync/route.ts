import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type {
  Appearance,
  Character,
  CharacterProfile,
  Emotion,
  GamePhase,
  GameState,
  InterrupterEmotion,
  Look,
  LookAttributes,
  Message,
  MessageRole,
  Personality,
} from '@/lib/types';
import type { SyncLoadResponse, SyncError, SyncPushBody } from '@/lib/api-types';

export const runtime = 'nodejs';

const SAVE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 1024 * 1024; // 1MB; base64 lives in Storage, never here.
const MSG_CHUNK = 500;

// --- DB row shapes (no generated types) --------------------------------------
interface CharacterRow {
  id: string;
  name: string;
  personality: string;
  appearance: string;
  profile: CharacterProfile | null;
  current_look_id: string | null;
  created_at: string;
  updated_at: string;
}
interface LookRow {
  id: string;
  character_id: string;
  label: string;
  attributes: LookAttributes | null;
  images: Partial<Record<Emotion, string>> | null;
  reference_image: string | null;
  base_prompt: string | null;
  created_at: string;
}
interface MessageRow {
  id: string;
  character_id: string;
  role: string;
  content: string;
  emotion: string | null;
  interrupter_id: string | null;
  system_note: boolean | null;
  created_at: string;
}
interface GameStateRow {
  character_id: string;
  affinity: number | null;
  jealousy: number | null;
  turn_count: number | null;
  phase: string | null;
  onboarding_turn: number | null;
  updated_at: string;
}

const toIso = (msVal: number | undefined) =>
  new Date(typeof msVal === 'number' ? msVal : Date.now()).toISOString();
const toMs = (s: string | null | undefined) => (s ? Date.parse(s) : Date.now());

const emptyGameState = (): GameState => ({
  affinity: 50,
  jealousy: 0,
  currentCharacterId: null,
  activeInterrupterId: null,
  messages: [],
  turnCount: 0,
  phase: 'playing',
  onboardingTurn: 0,
  isGeneratingLook: false,
});

// =============================================================================
// GET /api/sync?saveId=...  -> assemble the store snapshot from normalized rows
// =============================================================================
export async function GET(req: NextRequest) {
  const client = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json<SyncError>(
      { error: 'Supabase not configured', code: 'NO_SUPABASE' },
      { status: 503 }
    );
  }

  const saveId = req.nextUrl.searchParams.get('saveId') ?? '';
  if (!SAVE_ID_RE.test(saveId)) {
    return NextResponse.json<SyncError>(
      { error: 'Invalid saveId', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  try {
    const { data: charData, error: e1 } = await client
      .from('characters')
      .select('*')
      .eq('device_id', saveId)
      .order('created_at', { ascending: true });
    if (e1) throw e1;
    const charRows = (charData ?? []) as CharacterRow[];
    const charIds = charRows.map((r) => r.id);

    let lookRows: LookRow[] = [];
    if (charIds.length) {
      const { data, error } = await client
        .from('looks')
        .select('*')
        .in('character_id', charIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      lookRows = (data ?? []) as LookRow[];
    }
    const looksByChar = new Map<string, Look[]>();
    for (const lr of lookRows) {
      const look: Look = {
        id: lr.id,
        label: lr.label,
        attributes: lr.attributes ?? {},
        images: {},
        referenceImage: undefined,
        imageUrls: lr.images ?? {},
        referenceImageUrl: lr.reference_image ?? undefined,
        basePrompt: lr.base_prompt ?? undefined,
        createdAt: toMs(lr.created_at),
      };
      const arr = looksByChar.get(lr.character_id) ?? [];
      arr.push(look);
      looksByChar.set(lr.character_id, arr);
    }

    const characters: Character[] = charRows.map((cr) => {
      const looks = looksByChar.get(cr.id) ?? [];
      const currentLookId =
        cr.current_look_id && looks.some((l) => l.id === cr.current_look_id)
          ? cr.current_look_id
          : null;
      return {
        id: cr.id,
        name: cr.name,
        personality: cr.personality as Personality,
        appearance: cr.appearance as Appearance,
        profile: cr.profile ?? undefined,
        looks,
        currentLookId,
        createdAt: toMs(cr.created_at),
        updatedAt: toMs(cr.updated_at),
      };
    });

    // Resolve the active character = newest game_state row that still has a character.
    const { data: gsData, error: e3 } = await client
      .from('game_states')
      .select('*')
      .eq('device_id', saveId)
      .order('updated_at', { ascending: false });
    if (e3) throw e3;
    const gsRows = (gsData ?? []) as GameStateRow[];
    const activeRow = gsRows.find((r) => charIds.includes(r.character_id)) ?? null;
    const activeCharacterId = activeRow?.character_id ?? null;

    let messages: Message[] = [];
    if (activeCharacterId) {
      const { data: mData, error: e4 } = await client
        .from('messages')
        .select('*')
        .eq('character_id', activeCharacterId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (e4) throw e4;
      messages = ((mData ?? []) as MessageRow[]).map((m) => ({
        id: m.id,
        role: m.role as MessageRole,
        content: m.content,
        emotion: (m.emotion ?? undefined) as Emotion | InterrupterEmotion | undefined,
        interrupterId: m.interrupter_id ?? undefined,
        systemNote: m.system_note ?? false,
        timestamp: toMs(m.created_at),
      }));
    }

    const gameState: GameState = activeRow
      ? {
          affinity: activeRow.affinity ?? 50,
          jealousy: activeRow.jealousy ?? 0,
          currentCharacterId: activeCharacterId,
          activeInterrupterId: null,
          messages,
          turnCount: activeRow.turn_count ?? 0,
          phase: (activeRow.phase ?? 'playing') as GamePhase,
          onboardingTurn: activeRow.onboarding_turn ?? 0,
          isGeneratingLook: false,
        }
      : emptyGameState();

    const found = characters.length > 0 || activeRow != null;
    return NextResponse.json<SyncLoadResponse>({
      found,
      data: found ? { characters, gameState } : null,
    });
  } catch (err) {
    console.error('[api/sync GET]', err);
    return NextResponse.json<SyncError>(
      { error: err instanceof Error ? err.message : 'Unknown error', code: 'DB_FAILED' },
      { status: 502 }
    );
  }
}

// =============================================================================
// PUT /api/sync  -> upsert roster/looks, orphan-delete, replace active messages,
//                   upsert active game_state. device_id-scoped; idempotent.
// =============================================================================
export async function PUT(req: NextRequest) {
  const client = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json<SyncError>(
      { error: 'Supabase not configured', code: 'NO_SUPABASE' },
      { status: 503 }
    );
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json<SyncError>(
      { error: 'Request body too large', code: 'TOO_LARGE' },
      { status: 413 }
    );
  }

  let body: SyncPushBody;
  try {
    body = (await req.json()) as SyncPushBody;
  } catch {
    return NextResponse.json<SyncError>(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const { saveId, activeCharacterId, characters, gameState, messages, intent } = body;
  if (typeof saveId !== 'string' || !SAVE_ID_RE.test(saveId)) {
    return NextResponse.json<SyncError>({ error: 'Invalid saveId', code: 'BAD_REQUEST' }, { status: 400 });
  }
  if (!Array.isArray(characters)) {
    return NextResponse.json<SyncError>({ error: 'characters must be an array', code: 'BAD_REQUEST' }, { status: 400 });
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return NextResponse.json<SyncError>({ error: 'Payload too large', code: 'TOO_LARGE' }, { status: 413 });
  }

  // UUID backstop: no base36 id may reach uuid columns (guards un-migrated clients).
  const ids: unknown[] = [];
  for (const c of characters) {
    ids.push(c.id);
    if (c.currentLookId) ids.push(c.currentLookId);
    for (const l of c.looks ?? []) ids.push(l.id);
  }
  if (activeCharacterId != null) ids.push(activeCharacterId);
  if (Array.isArray(messages)) for (const m of messages) ids.push(m.id);
  if (ids.some((id) => typeof id !== 'string' || !UUID_RE.test(id))) {
    return NextResponse.json<SyncError>({ error: 'All entity ids must be UUIDs', code: 'BAD_REQUEST' }, { status: 400 });
  }
  // activeCharacterId must reference a pushed character (or be null). Otherwise
  // the messages/game_states writes hit the character_id FK and 502 instead of
  // failing fast with a clear 400.
  if (activeCharacterId != null && !characters.some((c) => c.id === activeCharacterId)) {
    return NextResponse.json<SyncError>(
      { error: 'activeCharacterId must be present in characters', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  try {
    // 1. Upsert characters (FK parents first). Defensive: base64 never mapped.
    if (characters.length) {
      const charRows = characters.map((c) => ({
        id: c.id,
        device_id: saveId,
        name: c.name,
        personality: c.personality,
        appearance: c.appearance,
        profile: c.profile ?? null,
        // Null out a currentLookId that doesn't reference one of this character's
        // looks, so orphan-look deletion can't leave a dangling current_look_id.
        current_look_id:
          c.currentLookId && (c.looks ?? []).some((l) => l.id === c.currentLookId)
            ? c.currentLookId
            : null,
        created_at: toIso(c.createdAt),
        updated_at: toIso(c.updatedAt),
      }));
      const { error } = await client.from('characters').upsert(charRows, { onConflict: 'id' });
      if (error) throw error;

      // 2. Upsert looks — Storage URLs ONLY (look.imageUrls / referenceImageUrl).
      const lookRows = characters.flatMap((c) =>
        (c.looks ?? []).map((l) => ({
          id: l.id,
          character_id: c.id,
          label: l.label,
          attributes: l.attributes ?? {},
          images: l.imageUrls ?? {},
          reference_image: l.referenceImageUrl ?? null,
          base_prompt: l.basePrompt ?? null,
          created_at: toIso(l.createdAt),
        }))
      );
      if (lookRows.length) {
        const { error: le } = await client.from('looks').upsert(lookRows, { onConflict: 'id' });
        if (le) throw le;
      }
    }

    // 3. Orphan deletion (device-scoped). Empty roster is a no-op unless intent:'reset'.
    if (characters.length > 0 || intent === 'reset') {
      const keepCharIds = characters.map((c) => c.id);
      const { data: existing, error: ee } = await client
        .from('characters')
        .select('id')
        .eq('device_id', saveId);
      if (ee) throw ee;
      const removedCharIds = ((existing ?? []) as { id: string }[])
        .map((r) => r.id)
        .filter((id) => !keepCharIds.includes(id));
      if (removedCharIds.length) {
        // children before parents (route does not rely on FK cascade).
        const d1 = await client.from('messages').delete().in('character_id', removedCharIds);
        if (d1.error) throw d1.error;
        const d2 = await client.from('game_states').delete().in('character_id', removedCharIds);
        if (d2.error) throw d2.error;
        const d3 = await client.from('looks').delete().in('character_id', removedCharIds);
        if (d3.error) throw d3.error;
        const d4 = await client.from('characters').delete().in('id', removedCharIds);
        if (d4.error) throw d4.error;
      }
      // Orphan looks under surviving characters (a removed/regenerated look).
      if (keepCharIds.length) {
        const keepLookIds = characters.flatMap((c) => (c.looks ?? []).map((l) => l.id));
        let q = client.from('looks').delete().in('character_id', keepCharIds);
        if (keepLookIds.length) {
          q = q.not('id', 'in', `(${keepLookIds.join(',')})`);
        }
        const { error: le } = await q;
        if (le) throw le;
      }
    }

    // 4. Messages: replace the active character's transcript (skip when null).
    if (messages != null && activeCharacterId) {
      const del = await client.from('messages').delete().eq('character_id', activeCharacterId);
      if (del.error) throw del.error;
      const rows = messages.map((m) => ({
        id: m.id,
        character_id: activeCharacterId,
        role: m.role,
        content: m.content,
        emotion: m.emotion ?? null,
        interrupter_id: m.interrupterId ?? null,
        system_note: m.systemNote ?? false,
        created_at: toIso(m.timestamp),
      }));
      for (let i = 0; i < rows.length; i += MSG_CHUNK) {
        const { error: ie } = await client.from('messages').insert(rows.slice(i, i + MSG_CHUNK));
        if (ie) throw ie;
      }
    }

    // 5. Upsert the active character's game_state (updated_at=now drives active resolution).
    if (activeCharacterId && gameState) {
      const { error: ge } = await client.from('game_states').upsert(
        {
          device_id: saveId,
          character_id: activeCharacterId,
          affinity: gameState.affinity ?? 50,
          jealousy: gameState.jealousy ?? 0,
          turn_count: gameState.turnCount ?? 0,
          phase: gameState.phase ?? 'playing',
          onboarding_turn: gameState.onboardingTurn ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_id,character_id' }
      );
      if (ge) throw ge;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/sync PUT]', err);
    return NextResponse.json<SyncError>(
      { error: err instanceof Error ? err.message : 'Unknown error', code: 'DB_FAILED' },
      { status: 502 }
    );
  }
}
