import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Character, Message } from './types';

let cachedSoul: string | null = null;

function loadSoul(): string {
  if (cachedSoul) return cachedSoul;
  try {
    cachedSoul = readFileSync(join(process.cwd(), 'prompts/soul.md'), 'utf-8');
  } catch (err) {
    cachedSoul = FALLBACK_SOUL;
  }
  return cachedSoul;
}

const FALLBACK_SOUL = `あなたは恋愛シミュレーションゲーム「妄想メモリアル」のキャラを演じます。
character情報と現在のaffinity、会話履歴に基づき、JSONフォーマットで応答してください:
{ "message": string, "affinityDelta": number(-20..20), "emotion": "neutral"|"happy"|"shy"|"worried"|"angry", "innerThought": string }
日本語で1〜3文、80文字以内で返してください。`;

export function buildSystemInstruction(
  character: Character,
  affinity: number,
  jealousy: number
): string {
  const soul = loadSoul();

  const dynamicContext = `
---

# 現在のセッション情報

- name: ${character.name}
- personality: ${character.personality}
- appearance: ${character.appearance}
- affinity（現在の好感度）: ${affinity} / 100
- jealousy（嫉妬度）: ${jealousy} / 100

これらの値に従って、上記soul.mdの規定通りに応答してください。
`;

  return soul + dynamicContext;
}

export function buildHistoryContents(messages: Message[]): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'character')
    .slice(-20)
    .map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.role === 'character' ? buildModelEcho(m.content) : m.content }],
    }));
}

function buildModelEcho(text: string): string {
  return JSON.stringify({
    message: text,
    affinityDelta: 0,
    emotion: 'neutral',
    innerThought: '',
  });
}
