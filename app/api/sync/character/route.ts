import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type {
  Emotion,
  GamePhase,
  InterrupterEmotion,
  Message,
  MessageRole,
} from '@/lib/types';
import type { CharacterSessionResponse, SyncError } from '@/lib/api-types';

export const runtime = 'nodejs';

const SAVE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MessageRow {
  id: string;
  role: string;
  content: string;
  emotion: string | null;
  interrupter_id: string | null;
  system_note: boolean | null;
  created_at: string;
}
interface GameStateRow {
  affinity: number | null;
  jealousy: number | null;
  turn_count: number | null;
  phase: string | null;
  onboarding_turn: number | null;
}

const toMs = (s: string | null | undefined) => (s ? Date.parse(s) : Date.now());

// Restores ONE character's saved session (game_state + transcript) for re-entry.
export async function GET(req: NextRequest) {
  const client = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json<SyncError>(
      { error: 'Supabase not configured', code: 'NO_SUPABASE' },
      { status: 503 }
    );
  }

  const saveId = req.nextUrl.searchParams.get('saveId') ?? '';
  const characterId = req.nextUrl.searchParams.get('characterId') ?? '';
  if (!SAVE_ID_RE.test(saveId) || !UUID_RE.test(characterId)) {
    return NextResponse.json<SyncError>(
      { error: 'Invalid saveId/characterId', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  try {
    const { data: gsData, error: e1 } = await client
      .from('game_states')
      .select('*')
      .eq('device_id', saveId)
      .eq('character_id', characterId)
      .maybeSingle();
    if (e1) throw e1;

    const { data: mData, error: e2 } = await client
      .from('messages')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (e2) throw e2;

    const messages: Message[] = ((mData ?? []) as MessageRow[]).map((m) => ({
      id: m.id,
      role: m.role as MessageRole,
      content: m.content,
      emotion: (m.emotion ?? undefined) as Emotion | InterrupterEmotion | undefined,
      interrupterId: m.interrupter_id ?? undefined,
      systemNote: m.system_note ?? false,
      timestamp: toMs(m.created_at),
    }));

    const gs = gsData as GameStateRow | null;
    const gameState = gs
      ? {
          affinity: gs.affinity ?? 50,
          jealousy: gs.jealousy ?? 0,
          turnCount: gs.turn_count ?? 0,
          phase: (gs.phase ?? 'playing') as GamePhase,
          onboardingTurn: gs.onboarding_turn ?? 0,
        }
      : null;

    return NextResponse.json<CharacterSessionResponse>({
      found: gameState != null || messages.length > 0,
      gameState,
      messages,
    });
  } catch (err) {
    console.error('[api/sync/character GET]', err);
    return NextResponse.json<SyncError>(
      { error: err instanceof Error ? err.message : 'Unknown error', code: 'DB_FAILED' },
      { status: 502 }
    );
  }
}
