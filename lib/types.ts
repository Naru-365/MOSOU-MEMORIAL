// Character types
export type Personality = '優しい' | 'クール' | 'ツンデレ';
export type Appearance = '清楚系' | 'ギャル系' | 'ナチュラル';

export interface Character {
  id: string;
  name: string;
  personality: Personality;
  appearance: Appearance;
  imageUrl?: string; // legacy; resolver in lib/character-asset.ts is the source of truth
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

// Chat message types
export type MessageRole = 'user' | 'character' | 'interrupter';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  emotion?: Emotion | InterrupterEmotion;
  interrupterId?: string;
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
export interface GameState {
  affinity: number; // 0-100
  jealousy: number; // 0-100
  currentCharacterId: string | null;
  activeInterrupterId: string | null;
  messages: Message[];
  turnCount: number;
}

// App-wide settings
export interface AppSettings {
  userName: string;
  assetMode: AssetMode;
}
