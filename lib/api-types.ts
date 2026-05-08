import type {
  Character,
  Emotion,
  GameState,
  Interrupter,
  InterrupterEmotion,
  Message,
} from './types';

// ----- /api/chat request/response -----

export interface ChatApiRequest {
  character: Character;
  interrupters: Interrupter[];
  gameState: GameState;
  userMessage: string;
  userName: string;
  /** Last N messages of the conversation for context. Newest last. */
  history: Message[];
}

export type ChatApiSpeaker = 'character' | 'interrupter';

export interface ChatApiResponse {
  speaker: ChatApiSpeaker;
  interrupterId?: string;
  reply: string;
  affinityChange: number; // clamped on server [-15, 15]
  jealousyChange: number; // clamped on server [-15, 15]
  emotion: Emotion | InterrupterEmotion;
}

export interface ChatApiError {
  error: string;
  code?: 'NO_API_KEY' | 'GEMINI_FAILED' | 'BAD_REQUEST';
}
