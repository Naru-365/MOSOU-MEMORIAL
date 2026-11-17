import type { CharacterMemory } from './types';

/**
 * Long-term memory policy (改善3b).
 *
 * The chat route only ever sees the last 10 messages. Every
 * MEMORY_SUMMARY_INTERVAL playing turns, the client asks
 * /api/memory/summarize to fold the recent transcript into the character's
 * stored memory (summary + facts). The chat prompt then injects that
 * memory, so she can refer back to things said long ago.
 */

/** Playing turns between memory distillations. */
export const MEMORY_SUMMARY_INTERVAL = 20;

/** Turns to wait before retrying after a failed distillation attempt. */
export const MEMORY_RETRY_INTERVAL = 5;

/** Messages handed to the summarizer (recent window; memory covers older). */
export const MEMORY_SUMMARY_WINDOW = 40;

/** Cap stored facts so the prompt block stays small. */
export const MAX_MEMORY_FACTS = 12;

/** True when a distillation is due for the given turn count. */
export function isMemorySummaryDue(
  memory: CharacterMemory | undefined,
  turnCount: number
): boolean {
  if (turnCount <= 0) return false;
  const last = memory?.summarizedTurnCount ?? 0;
  return turnCount - last >= MEMORY_SUMMARY_INTERVAL;
}

/** Prompt block injected into the heroine system prompt, or '' when empty. */
export function buildMemoryPromptSection(
  memory: CharacterMemory | undefined
): string {
  if (!memory || (!memory.summary && memory.facts.length === 0)) return '';
  const lines = [
    '',
    '# あなたの長期記憶（これまでの会話から覚えていること）',
    '- 自然に活かすこと。「覚えている」と宣言したり、記憶を読み上げたりしない',
    '- ここにない昔の話を聞かれたら、曖昧にごまかさず「忘れちゃったかも」と正直に',
  ];
  if (memory.summary) lines.push(`- これまでの流れ: ${memory.summary}`);
  for (const fact of memory.facts.slice(0, MAX_MEMORY_FACTS)) {
    lines.push(`- ${fact}`);
  }
  return lines.join('\n');
}

/** Normalize a summarizer result into a storable CharacterMemory. */
export function normalizeMemory(
  input: { summary?: string; facts?: string[] },
  summarizedTurnCount: number
): CharacterMemory {
  return {
    summary: (input.summary ?? '').trim().slice(0, 600),
    facts: (input.facts ?? [])
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .slice(0, MAX_MEMORY_FACTS),
    summarizedTurnCount,
    updatedAt: Date.now(),
  };
}
