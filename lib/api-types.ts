import type {
  Character,
  CharacterProfile,
  Emotion,
  GamePhase,
  GameState,
  Interrupter,
  InterrupterEmotion,
  LookAttributes,
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
  /** 'onboarding' runs the hearing flow; 'playing' is normal chat. Default 'playing'. */
  phase?: GamePhase;
  /** Rallies elapsed in onboarding so far (drives "wrap it up" guidance). */
  onboardingTurn?: number;
}

export type ChatApiSpeaker = 'character' | 'interrupter';

/** Extra payload returned only during onboarding. */
export interface OnboardingResult {
  /** True when the heroine has gathered enough to be "born" (generate a look). */
  complete: boolean;
  /** Collected preferences; present (at least partially) once complete. */
  profile?: CharacterProfile;
}

export interface ChatApiResponse {
  speaker: ChatApiSpeaker;
  interrupterId?: string;
  reply: string;
  affinityChange: number; // clamped on server [-15, 15]
  jealousyChange: number; // clamped on server [-15, 15]
  emotion: Emotion | InterrupterEmotion;
  /** Present when the request was in onboarding phase. */
  onboarding?: OnboardingResult;
}

export interface ChatApiError {
  error: string;
  code?: 'NO_API_KEY' | 'GEMINI_FAILED' | 'BAD_REQUEST';
}

// ----- /api/generate-look request/response -----
// Generates a character look with gpt-image-2. With no referenceImage it does a
// fresh generation (the first look); with one it does an edit so identity is
// preserved across appearance changes.

export interface GenerateLookRequest {
  characterName: string;
  /** For the first look: free-form hearing results from onboarding. */
  profile?: CharacterProfile;
  /** Desired attributes for this look (hair/outfit/age/species/...). */
  attributes?: LookAttributes;
  /** Natural-language change for an existing character (e.g. "ボブにする"). */
  changeInstruction?: string;
  /**
   * Prior look's neutral image (data URL or bare base64) used as the edit
   * reference to keep identity. Omit for the first look.
   */
  referenceImage?: string;
  /** Which emotions to render. Defaults to ['neutral']. */
  emotions?: Emotion[];
  /** Image size, default '1024x1536' (portrait bust-up). */
  size?: string;
  /** Quality, default 'low' for fast PoC drafts. */
  quality?: 'low' | 'medium' | 'high' | 'auto';
}

export interface GenerateLookResponse {
  /** emotion -> data URL (data:image/png;base64,...). */
  images: Partial<Record<Emotion, string>>;
  /** The neutral data URL (reference face for the next look's edit). */
  referenceImage: string;
  /** The locked base prompt used (handy for debugging / regeneration). */
  basePrompt: string;
  /** Echo of the resolved attributes for this look. */
  attributes: LookAttributes;
}

export interface GenerateLookError {
  error: string;
  /** NO_IMAGE_API => no OPENAI_API_KEY configured; UI degrades to silhouette. */
  code?: 'NO_IMAGE_API' | 'OPENAI_FAILED' | 'BAD_REQUEST';
}

// ----- /api/looks/upload request/response -----
// Persists generated look images (base64) to Supabase Storage and returns their
// public URLs. saveId/characterId/lookId form the storage path.

export interface UploadLookRequest {
  saveId: string;
  characterId: string;
  lookId: string;
  /** emotion -> data URL (data:image/png;base64,...). */
  images: Partial<Record<Emotion, string>>;
  /** Optional neutral reference data URL; stored as `_reference.png`. */
  referenceImage?: string;
}

export interface UploadLookResponse {
  /** emotion -> Supabase Storage public URL. */
  imageUrls: Partial<Record<Emotion, string>>;
  /** Public URL of the reference image, when provided. */
  referenceImageUrl?: string;
}

export interface UploadLookError {
  error: string;
  code?: 'NO_SUPABASE' | 'BAD_REQUEST' | 'TOO_LARGE' | 'UPLOAD_FAILED';
}

// ----- /api/save request/response -----
// Anonymous cloud save keyed by saveId. The stored `data` is the serialized
// store snapshot (heavy base64 images stripped; image URLs retained).

export interface SaveLoadResponse {
  found: boolean;
  data: unknown | null;
  updatedAt: string | null;
}

export interface SaveError {
  error: string;
  code?: 'NO_SUPABASE' | 'BAD_REQUEST' | 'TOO_LARGE' | 'DB_FAILED';
}
