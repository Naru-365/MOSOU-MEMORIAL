// Character types
export type CharacterRole = '恋愛相手' | '邪魔者';

export interface Character {
  id: string;
  name: string;
  role: CharacterRole;
  personality: '優しい' | 'クール' | 'ツンデレ';
  appearance: '清楚系' | 'ギャル系' | 'ナチュラル';
  imageUrl: string;
  createdAt: number;
  updatedAt: number;
}

// Chat message types
export type MessageRole = 'user' | 'character' | 'interrupter';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

// Game state
export interface GameState {
  affinity: number; // 0-100
  jealousy: number; // 0-100
  currentCharacterId: string | null;
  messages: Message[];
}

// Choice types
export interface Choice {
  label: string;
  value: 'positive' | 'neutral' | 'negative';
  affinityChange: number;
}

// Interrupter types
export type InterrupterType = 'ツッコミ系' | '束縛系' | 'メタ系';

export interface Interrupter {
  type: InterrupterType;
  traits: string[];
}

// Story types
export interface StorySceneChoice {
  label: string;
  affinityChange: number;
  response: string;
}

export interface StoryScene {
  id: string;
  type: 'narration' | 'dialogue' | 'choice';
  speaker?: 'player' | 'lover' | 'interrupter';
  text: string;
  choices?: StorySceneChoice[];
}

export interface StoryChapter {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  requiredAffinity: number;
}

export interface StoryProgress {
  completedChapterIds: string[];
  storyAffinity: number;
}
