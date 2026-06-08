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
  /** When true (playing only), pre-fetch real-world facts via Google Search. */
  webGrounding?: boolean;
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

// ----- /api/generate-background request/response -----
// Generates an empty scene background (no people) that fits the character's mood,
// uploads it to Supabase Storage, and returns both the data URL (instant display)
// and the persisted public URL.

export interface GenerateBackgroundRequest {
  saveId: string;
  characterId: string;
  characterName: string;
  profile?: CharacterProfile;
  attributes?: LookAttributes;
}

export interface GenerateBackgroundResponse {
  /** data URL for immediate display. */
  image: string;
  /** Supabase Storage public URL (persisted), when Storage is configured. */
  imageUrl?: string;
}

export interface GenerateBackgroundError {
  error: string;
  code?: 'NO_IMAGE_API' | 'OPENAI_FAILED' | 'BAD_REQUEST' | 'UPLOAD_FAILED';
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

// ----- /api/sync request/response -----
// Normalized cloud save keyed by device_id (= saveId) across the existing
// characters / looks / messages / game_states tables. interrupters/settings stay
// local. Heavy base64 never crosses this boundary — only Storage URLs.

/** The portion of GameState persisted per (device_id, character_id). */
export type SyncGameState = Pick<
  GameState,
  'affinity' | 'jealousy' | 'currentCharacterId' | 'turnCount' | 'phase' | 'onboardingTurn'
>;

export interface SyncPushBody {
  saveId: string;
  activeCharacterId: string | null;
  /** Full roster (base64 stripped; Look.imageUrls/referenceImageUrl carry URLs). */
  characters: Character[];
  gameState: SyncGameState;
  /** Active session transcript, or null to skip the message replace (unchanged). */
  messages: Message[] | null;
  /** 'reset' authorizes an empty-roster push to wipe remote data (resetAll). */
  intent?: 'reset';
}

export interface SyncSnapshot {
  characters: Character[];
  gameState: GameState;
}

export interface SyncLoadResponse {
  found: boolean;
  data: SyncSnapshot | null;
}

export interface SyncError {
  error: string;
  code?: 'NO_SUPABASE' | 'BAD_REQUEST' | 'TOO_LARGE' | 'DB_FAILED';
}

// ----- /api/sync/character (per-character hydration) -----
// Restores ONE character's saved session (affinity/turn/phase + transcript) when
// the player re-enters that character's chat, keyed by (device_id, character_id).

export interface CharacterSessionResponse {
  found: boolean;
  gameState: {
    affinity: number;
    jealousy: number;
    turnCount: number;
    phase: GamePhase;
    onboardingTurn: number;
  } | null;
  messages: Message[];
}
