import type { Character, Look, LookAttributes } from './types';

const genId = () => Math.random().toString(36).substring(2, 15);

/** Build a Look object (metadata only; images filled in after generation). */
export function createLook(
  label: string,
  attributes: LookAttributes,
  opts: { basePrompt?: string } = {}
): Look {
  return {
    id: genId(),
    label,
    attributes,
    images: {},
    basePrompt: opts.basePrompt,
    createdAt: Date.now(),
  };
}

/** Resolve the character's active look (or null when formless). */
export function getCurrentLook(
  character: Pick<Character, 'looks' | 'currentLookId'> | null | undefined
): Look | null {
  if (!character || !character.looks || !character.currentLookId) return null;
  return character.looks.find((l) => l.id === character.currentLookId) ?? null;
}

/**
 * Merge a previous look's attributes with a change, producing the next look's
 * attributes. Undefined fields in `change` keep the previous value.
 */
export function mergeLookAttributes(
  prev: LookAttributes | undefined,
  change: LookAttributes
): LookAttributes {
  return {
    hair: change.hair ?? prev?.hair,
    outfit: change.outfit ?? prev?.outfit,
    age: change.age ?? prev?.age,
    species: change.species ?? prev?.species,
    vibe: change.vibe ?? prev?.vibe,
    extra: change.extra ?? prev?.extra,
  };
}

// --- Look-change detection from free chat -------------------------------------
// Lightweight, deterministic keyword triggers so an appearance change can fire
// without an extra LLM call. The chat route can also override with richer
// structured output later.

export interface LookChangeIntent {
  /** Human label for the new look, e.g. "ボブにした". */
  label: string;
  /** Natural-language edit instruction for gpt-image-2. */
  instruction: string;
  /** Attribute delta to merge onto the current look. */
  attributes: LookAttributes;
}

interface LookTrigger {
  keywords: string[];
  build: () => LookChangeIntent;
}

const LOOK_TRIGGERS: LookTrigger[] = [
  {
    keywords: ['美容院', '美容室', '髪切', '髪を切', 'ヘアサロン', 'カット'],
    build: () => ({
      label: '髪型を変えた',
      instruction: 'give her a fresh new haircut, keep her face and identity identical',
      attributes: { hair: '新しい髪型' },
    }),
  },
  {
    keywords: ['服', '着替', '買い物', 'コーデ', 'ショッピング', '服を買'],
    build: () => ({
      label: '服を変えた',
      instruction: 'change her outfit to a new stylish one, keep her face and identity identical',
      attributes: { outfit: '新しい服' },
    }),
  },
  {
    keywords: ['歳を取', '年を取', '大人にな', '老け', '未来'],
    build: () => ({
      label: '歳を取った',
      instruction: 'make her about 10 years older, keep her face and identity recognizable',
      attributes: { age: '年上' },
    }),
  },
  {
    keywords: ['タイムスリップ', '若返', '子供の頃', '過去に戻', '昔'],
    build: () => ({
      label: '若返った',
      instruction: 'make her much younger (a child/teen version), keep her face and identity recognizable',
      attributes: { age: '若い' },
    }),
  },
  {
    keywords: ['犬', 'わんこ', '柴犬', 'ペット', '動物'],
    build: () => ({
      label: '実は犬だった',
      instruction: 'reimagine her as a cute shiba dog, keep her color palette, vibe and accessories',
      attributes: { species: '犬' },
    }),
  },
];

/** Returns a look-change intent if the text matches a trigger, else null. */
export function detectLookChange(text: string): LookChangeIntent | null {
  for (const t of LOOK_TRIGGERS) {
    if (t.keywords.some((k) => text.includes(k))) return t.build();
  }
  return null;
}
