// Emotion types (for character images and AI response)
export type Emotion = 'neutral' | 'happy' | 'shy' | 'worried' | 'angry';

export const EMOTIONS: Emotion[] = ['neutral', 'happy', 'shy', 'worried', 'angry'];

export const EMOTION_LABELS: Record<Emotion, string> = {
  neutral: 'ニュートラル',
  happy: '嬉しい',
  shy: '照れ',
  worried: '困り',
  angry: '怒り',
};

// Character image map: each emotion -> base64 dataURL (or empty string if not uploaded)
export type CharacterImages = Partial<Record<Emotion, string>>;

// Character types
export interface Character {
  id: string;
  name: string;
  personality: '優しい' | 'クール' | 'ツンデレ';
  appearance: '清楚系' | 'ギャル系' | 'ナチュラル';
  images: CharacterImages;
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
  emotion?: Emotion;
}

// Game state
export interface GameState {
  affinity: number; // 0-100
  jealousy: number; // 0-100
  currentCharacterId: string | null;
  messages: Message[];
  currentEmotion: Emotion;
}

// Choice types (legacy quick-action buttons)
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

// AI response shape (returned from /api/chat)
export interface AIChatResponse {
  message: string;
  affinityDelta: number;
  emotion: Emotion;
  innerThought?: string;
}
