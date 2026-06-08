// Character types
export type Personality = '優しい' | 'クール' | 'ツンデレ';
export type Appearance = '清楚系' | 'ギャル系' | 'ナチュラル';

// ----- New concept: conversational open world -----
// A character starts "formless" (no confirmed look). Through ~10 rallies of
// onboarding chat we collect a CharacterProfile, then generate the first Look.
// During play the appearance changes (haircut / outfit / aging / time travel /
// even species). Each visual snapshot is a Look with its own reference face.

/** Free-form hearing results collected during onboarding. */
export interface CharacterProfile {
  appearanceNotes?: string; // overall look/face/vibe described in words
  personalityNotes?: string;
  hairStyle?: string;
  outfit?: string;
  vibe?: string;
  nickname?: string; // how the heroine addresses the user (optional)
  /** LLM-built one-paragraph summary used as the locked base prompt seed. */
  rawSummary?: string;
}

/** Mutable appearance attributes for a single visual snapshot (look). */
export interface LookAttributes {
  hair?: string; // 髪型
  outfit?: string; // 服
  age?: string; // 年齢ステージ（例: 高校生 / 20代 / 子供）
  species?: string; // 種族（例: 人間 / 柴犬）
  vibe?: string; // 雰囲気
  extra?: string; // freeform notes
}

/**
 * A Look = one confirmed appearance snapshot.
 * `images` holds generated data URLs per emotion. These are stripped before
 * persisting to localStorage (see store partialize) to respect the storage
 * quota; metadata + basePrompt persist so a look can be regenerated.
 */
export interface Look {
  id: string;
  label: string; // 例: "初期" / "ボブにした" / "犬になった"
  attributes: LookAttributes;
  images: Partial<Record<Emotion, string>>; // emotion -> data URL (runtime)
  referenceImage?: string; // neutral data URL used as edit reference (runtime)
  basePrompt?: string; // locked identity+look prompt used to generate
  createdAt: number;
}

export interface Character {
  id: string;
  name: string;
  personality: Personality;
  appearance: Appearance; // legacy seed + fallback image slug
  imageUrl?: string; // legacy; resolver in lib/character-asset.ts is the source of truth
  // New-concept fields (all optional for backward compat):
  profile?: CharacterProfile; // filled during onboarding
  looks?: Look[]; // confirmed appearance snapshots
  currentLookId?: string | null; // active look; null/undefined => formless
  /** Set when affinity hit 0 and she vanished. Locks the character from chat. */
  disappeared?: boolean;
  createdAt: number;
  updatedAt: number;
}

// Emotion + asset types
export type Emotion =
  | 'neutral'
  | 'happy'
  | 'tsun'
  | 'blush'
  | 'angry'
  | 'surprised'
  | 'laugh'
  | 'sad';

export type InterrupterEmotion = 'intro' | 'peeved' | 'smug';

export type AssetMode = 'image' | 'video' | '3d';

// Chat scene backgrounds (assets under /public/images/backgrounds).
export type SceneKey = 'school' | 'night_park';

// Chat message types
export type MessageRole = 'user' | 'character' | 'interrupter';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  emotion?: Emotion | InterrupterEmotion;
  interrupterId?: string;
  /** Marks a system note such as a look change ("髪型が変わった！"). */
  systemNote?: boolean;
}

// Choice types
export type ChoiceArchetype = 'boke' | 'tsukkomi' | 'fujori';
export type ChoiceValue = 'positive' | 'neutral' | 'negative';

export interface Choice {
  label: string;
  value: ChoiceValue;
  archetype: ChoiceArchetype;
  affinityChange: number;
}

// Interrupter (邪魔者) — first-class CRUD entity
export type InterrupterArchetype = 'tsukkomi' | 'yandere' | 'meta' | 'custom';

export interface InterrupterTrigger {
  // OR semantics: any matching condition allows the base probability roll
  minJealousy?: number;
  everyNTurns?: number;
  keywordTriggers?: string[];
  baseProbability?: number; // 0..1, default 0.2
}

export interface Interrupter {
  id: string;
  name: string;
  archetype: InterrupterArchetype;
  description?: string;
  messageTemplates: string[]; // supports {char} {user} {topic} {recent} slots
  trigger: InterrupterTrigger;
  modifiedChoices: Choice[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// Game state
export type GamePhase = 'onboarding' | 'playing';

export interface GameState {
  affinity: number; // 0-100
  jealousy: number; // 0-100
  currentCharacterId: string | null;
  activeInterrupterId: string | null;
  messages: Message[];
  turnCount: number;
  // New-concept session fields:
  phase: GamePhase; // 'onboarding' until first look confirmed, then 'playing'
  onboardingTurn: number; // hearing rallies elapsed during onboarding
  isGeneratingLook: boolean; // image generation in flight (UI spinner)
}

// App-wide settings
export interface AppSettings {
  userName: string;
  assetMode: AssetMode;
  /** Pull real-world facts into chat via Google Search grounding. Default off. */
  webGrounding: boolean;
  /** Chat scene background. */
  sceneKey: SceneKey;
}
