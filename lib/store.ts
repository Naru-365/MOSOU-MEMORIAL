'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type {
  AppSettings,
  Character,
  CharacterProfile,
  Emotion,
  GamePhase,
  GameState,
  Interrupter,
  Look,
  Message,
} from './types';
import type { CharacterSessionResponse } from './api-types';
import { defaultInterrupters } from './defaults';
import { isFormless } from './onboarding';

interface AppState {
  // Characters
  characters: Character[];
  addCharacter: (
    character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'imageUrl'>
  ) => Character;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharacter: (id: string) => Character | undefined;

  // Looks (appearance snapshots) + onboarding profile
  setCharacterProfile: (characterId: string, profile: CharacterProfile) => void;
  addLook: (characterId: string, look: Look) => void;
  setCurrentLook: (characterId: string, lookId: string) => void;
  updateLookImages: (
    characterId: string,
    lookId: string,
    images: Partial<Record<Emotion, string>>,
    referenceImage?: string
  ) => void;

  // Interrupters
  interrupters: Interrupter[];
  addInterrupter: (
    interrupter: Omit<Interrupter, 'id' | 'createdAt' | 'updatedAt'>
  ) => Interrupter;
  updateInterrupter: (id: string, updates: Partial<Interrupter>) => void;
  deleteInterrupter: (id: string) => void;
  getInterrupter: (id: string) => Interrupter | undefined;
  resetInterruptersToDefault: () => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Game state
  gameState: GameState;
  /** Start a chat session; phase is 'onboarding' for formless characters. */
  startSession: (characterId: string) => void;
  /** Back-compat alias of startSession. */
  setCurrentCharacter: (characterId: string | null) => void;
  setPhase: (phase: GamePhase) => void;
  incrementOnboardingTurn: () => void;
  setGeneratingLook: (value: boolean) => void;
  updateAffinity: (change: number) => void;
  updateJealousy: (change: number) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  incrementTurn: () => void;
  setActiveInterrupter: (id: string | null) => void;
  resetGameState: () => void;

  // Cloud sync (Supabase)
  /** Anonymous, unguessable owner key (UUID); generated once, persisted. */
  saveId: string;
  setLookImageUrls: (
    characterId: string,
    lookId: string,
    imageUrls: Partial<Record<Emotion, string>>,
    referenceImageUrl?: string
  ) => void;
  /** Replace synced data (characters + active gameState) from a cloud snapshot. */
  applyCloudData: (data: unknown) => void;
  /** Restore one character's saved session (affinity + transcript) on chat entry. */
  hydrateCharacterSession: (
    characterId: string,
    data: CharacterSessionResponse
  ) => void;
  /** One-shot flag: the next cloud push is an authorized full wipe (resetAll). */
  pendingReset: boolean;
  clearPendingReset: () => void;

  // Full reset
  resetAll: () => void;
}

// UUID-shaped fallback for non-secure contexts (http, no crypto.randomUUID).
// Must be uuid-shaped so it satisfies the DB uuid columns and the server's
// strict uuid validation.
const fallbackUuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

// All DB-backed entity ids (characters/looks/messages) and saveId/device_id are
// UUIDs to match the normalized Supabase schema (uuid PK columns).
const uuid = () => globalThis.crypto?.randomUUID?.() ?? fallbackUuid();

const generateId = uuid;
const generateSaveId = uuid;

const initialGameState: GameState = {
  affinity: 50,
  jealousy: 0,
  currentCharacterId: null,
  activeInterrupterId: null,
  messages: [],
  turnCount: 0,
  phase: 'playing',
  onboardingTurn: 0,
  isGeneratingLook: false,
};

const initialSettings: AppSettings = {
  userName: 'プレイヤー',
  assetMode: 'image',
};

/** Compute the starting phase for a character: formless -> onboarding. */
function phaseFor(character: Character | undefined): GamePhase {
  if (!character) return 'playing';
  return isFormless(character) ? 'onboarding' : 'playing';
}

/**
 * localStorage wrapper that self-heals on corruption. If the persisted blob is
 * truncated/invalid (e.g. quota cut a base64 image mid-write in an old build),
 * JSON.parse would throw and crash the app on load. We validate on read and drop
 * the bad value so the store falls back to defaults instead of crashing. All
 * access is guarded for SSR / blocked storage.
 */
const safeStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    try {
      const str = window.localStorage.getItem(name);
      if (!str) return null;
      JSON.parse(str); // validate; throws if corrupted/truncated
      return str;
    } catch {
      try {
        window.localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* quota exceeded or blocked — skip persisting this write */
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      characters: [],
      interrupters: defaultInterrupters,
      settings: initialSettings,
      gameState: initialGameState,
      saveId: generateSaveId(),
      pendingReset: false,

      addCharacter: (characterData) => {
        const newCharacter: Character = {
          id: generateId(),
          looks: [],
          currentLookId: null,
          ...characterData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          characters: [...state.characters, newCharacter],
        }));
        return newCharacter;
      },

      updateCharacter: (id, updates) => {
        set((state) => ({
          characters: state.characters.map((char) =>
            char.id === id
              ? { ...char, ...updates, updatedAt: Date.now() }
              : char
          ),
        }));
      },

      deleteCharacter: (id) => {
        set((state) => ({
          characters: state.characters.filter((char) => char.id !== id),
          gameState:
            state.gameState.currentCharacterId === id
              ? initialGameState
              : state.gameState,
        }));
      },

      getCharacter: (id) => {
        return get().characters.find((char) => char.id === id);
      },

      setCharacterProfile: (characterId, profile) => {
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === characterId
              ? {
                  ...c,
                  profile: { ...c.profile, ...profile },
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      addLook: (characterId, look) => {
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === characterId
              ? {
                  ...c,
                  looks: [...(c.looks ?? []), look],
                  currentLookId: look.id,
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      setCurrentLook: (characterId, lookId) => {
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === characterId
              ? { ...c, currentLookId: lookId, updatedAt: Date.now() }
              : c
          ),
        }));
      },

      updateLookImages: (characterId, lookId, images, referenceImage) => {
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === characterId
              ? {
                  ...c,
                  looks: (c.looks ?? []).map((l) =>
                    l.id === lookId
                      ? {
                          ...l,
                          images: { ...l.images, ...images },
                          referenceImage: referenceImage ?? l.referenceImage,
                        }
                      : l
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      setLookImageUrls: (characterId, lookId, imageUrls, referenceImageUrl) => {
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === characterId
              ? {
                  ...c,
                  looks: (c.looks ?? []).map((l) =>
                    l.id === lookId
                      ? {
                          ...l,
                          imageUrls: { ...(l.imageUrls ?? {}), ...imageUrls },
                          referenceImageUrl:
                            referenceImageUrl ?? l.referenceImageUrl,
                        }
                      : l
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      applyCloudData: (data) => {
        if (!data || typeof data !== 'object') return;
        const d = data as { characters?: Character[]; gameState?: GameState };
        set((state) => {
          const characters = Array.isArray(d.characters)
            ? d.characters
            : state.characters;
          if (!d.gameState) return { characters };
          // Null-safe the active character against the restored roster.
          const cid = d.gameState.currentCharacterId;
          const validCid = cid && characters.some((c) => c.id === cid) ? cid : null;
          return {
            characters,
            gameState: {
              ...initialGameState,
              ...d.gameState,
              currentCharacterId: validCid,
              activeInterrupterId: null, // local-only, never synced
              isGeneratingLook: false, // runtime-only
            },
          };
        });
        // interrupters/settings are intentionally NOT synced (local-only config).
      },
      clearPendingReset: () => set(() => ({ pendingReset: false })),

      hydrateCharacterSession: (characterId, data) => {
        if (!data?.found) return;
        set((state) => {
          // Ignore a stale response if the player already switched characters.
          if (state.gameState.currentCharacterId !== characterId) return {};
          const gs = data.gameState;
          return {
            gameState: {
              ...state.gameState,
              ...(gs
                ? {
                    affinity: gs.affinity,
                    jealousy: gs.jealousy,
                    turnCount: gs.turnCount,
                    phase: gs.phase,
                    onboardingTurn: gs.onboardingTurn,
                  }
                : {}),
              messages: Array.isArray(data.messages)
                ? data.messages
                : state.gameState.messages,
              isGeneratingLook: false,
            },
          };
        });
      },

      addInterrupter: (data) => {
        const newInterrupter: Interrupter = {
          id: generateId(),
          ...data,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          interrupters: [...state.interrupters, newInterrupter],
        }));
        return newInterrupter;
      },

      updateInterrupter: (id, updates) => {
        set((state) => ({
          interrupters: state.interrupters.map((i) =>
            i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i
          ),
        }));
      },

      deleteInterrupter: (id) => {
        set((state) => ({
          interrupters: state.interrupters.filter((i) => i.id !== id),
          gameState:
            state.gameState.activeInterrupterId === id
              ? { ...state.gameState, activeInterrupterId: null }
              : state.gameState,
        }));
      },

      getInterrupter: (id) => {
        return get().interrupters.find((i) => i.id === id);
      },

      resetInterruptersToDefault: () => {
        set(() => ({ interrupters: defaultInterrupters }));
      },

      updateSettings: (updates) => {
        set((state) => ({ settings: { ...state.settings, ...updates } }));
      },

      startSession: (characterId) => {
        const character = get().characters.find((c) => c.id === characterId);
        set(() => ({
          gameState: {
            ...initialGameState,
            currentCharacterId: characterId,
            phase: phaseFor(character),
          },
        }));
      },

      setCurrentCharacter: (characterId) => {
        if (characterId === null) {
          set(() => ({ gameState: initialGameState }));
          return;
        }
        get().startSession(characterId);
      },

      setPhase: (phase) => {
        set((state) => ({ gameState: { ...state.gameState, phase } }));
      },

      incrementOnboardingTurn: () => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            onboardingTurn: state.gameState.onboardingTurn + 1,
          },
        }));
      },

      setGeneratingLook: (value) => {
        set((state) => ({
          gameState: { ...state.gameState, isGeneratingLook: value },
        }));
      },

      updateAffinity: (change) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            affinity: Math.max(
              0,
              Math.min(100, state.gameState.affinity + change)
            ),
          },
        }));
      },

      updateJealousy: (change) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            jealousy: Math.max(
              0,
              Math.min(100, state.gameState.jealousy + change)
            ),
          },
        }));
      },

      addMessage: (messageData) => {
        set((state) => {
          // Strictly-increasing timestamps so the cloud transcript (ordered by
          // created_at) reconstructs insertion order even when several messages
          // are added within the same millisecond.
          const prev = state.gameState.messages[state.gameState.messages.length - 1];
          const timestamp = prev ? Math.max(Date.now(), prev.timestamp + 1) : Date.now();
          const newMessage: Message = { id: generateId(), ...messageData, timestamp };
          return {
            gameState: {
              ...state.gameState,
              messages: [...state.gameState.messages, newMessage],
            },
          };
        });
      },

      clearMessages: () => {
        set((state) => ({
          gameState: { ...state.gameState, messages: [] },
        }));
      },

      incrementTurn: () => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            turnCount: state.gameState.turnCount + 1,
          },
        }));
      },

      setActiveInterrupter: (id) => {
        set((state) => ({
          gameState: { ...state.gameState, activeInterrupterId: id },
        }));
      },

      resetGameState: () => {
        set(() => ({ gameState: initialGameState }));
      },

      resetAll: () => {
        set(() => ({
          characters: [],
          gameState: initialGameState,
          interrupters: defaultInterrupters,
          settings: initialSettings,
          // Authorize the next cloud push to wipe remote data (empty-array
          // pushes are otherwise treated as a no-op by the sync route).
          pendingReset: true,
        }));
      },
    }),
    {
      name: 'mosou-memorial-storage',
      version: 4,
      storage: createJSONStorage(() => safeStorage),
      // Strip heavy base64 look images before writing to localStorage (quota is
      // ~5-10MB). Metadata + basePrompt persist so a look can be regenerated.
      partialize: (state) => ({
        ...state,
        characters: state.characters.map((c) => ({
          ...c,
          looks: (c.looks ?? []).map((l) => ({
            ...l,
            images: {},
            referenceImage: undefined,
          })),
        })),
        gameState: { ...state.gameState, isGeneratingLook: false },
        pendingReset: false, // transient; never persist a pending wipe
      }),
      migrate: (persisted: unknown, version: number) => {
        if (!persisted || typeof persisted !== 'object') return persisted;
        const p = persisted as Record<string, unknown>;
        const prevGame = (p.gameState ?? {}) as Partial<GameState>;
        if (version < 2) {
          p.interrupters =
            Array.isArray(p.interrupters) && p.interrupters.length > 0
              ? p.interrupters
              : defaultInterrupters;
          p.settings = (p.settings as AppSettings) ?? initialSettings;
        }
        if (version < 3) {
          // Backfill new-concept fields.
          p.characters = Array.isArray(p.characters)
            ? (p.characters as Character[]).map((c) => ({
                ...c,
                looks: c.looks ?? [],
                currentLookId: c.currentLookId ?? null,
              }))
            : [];
        }
        if (version < 4) {
          // Entity ids must be UUIDs to match the normalized Supabase schema
          // (uuid PK columns). Regenerate non-UUID ids and rewrite every
          // internal reference. Memoized + idempotent (uuid ids short-circuit).
          const isUuid = (s: unknown): s is string =>
            typeof s === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
          const idMap = new Map<string, string>();
          const remap = <T extends string | null | undefined>(old: T): T => {
            if (old == null || isUuid(old)) return old;
            const key = String(old);
            let next = idMap.get(key);
            if (!next) {
              next = uuid();
              idMap.set(key, next);
            }
            return next as T;
          };
          if (Array.isArray(p.characters)) {
            p.characters = (p.characters as Character[]).map((c) => ({
              ...c,
              id: remap(c.id),
              looks: (c.looks ?? []).map((l) => ({ ...l, id: remap(l.id) })),
              currentLookId: remap(c.currentLookId),
            }));
          }
          // Rewrite refs on the captured prevGame so the normalize below carries
          // them. remap() handles null/undefined, so call it unconditionally —
          // a falsy-but-present id must still be rewritten (no dangling base36).
          prevGame.currentCharacterId = remap(prevGame.currentCharacterId);
          if (Array.isArray(prevGame.messages)) {
            prevGame.messages = (prevGame.messages as Message[]).map((m) => ({
              ...m,
              id: remap(m.id),
            }));
          }
          // interrupter ids and activeInterrupterId stay as-is (local-only, no DB table).
        }
        p.gameState = {
          ...initialGameState,
          ...prevGame,
          // Coalesce to null: the v4 remap above can set currentCharacterId to
          // undefined when gameState was missing, which would violate the
          // string | null contract via the prevGame spread.
          currentCharacterId: prevGame.currentCharacterId ?? null,
          activeInterrupterId: prevGame.activeInterrupterId ?? null,
          turnCount: prevGame.turnCount ?? 0,
          phase: prevGame.phase ?? 'playing',
          onboardingTurn: prevGame.onboardingTurn ?? 0,
          isGeneratingLook: false,
        };
        return p;
      },
    }
  )
);

/**
 * Builds the normalized cloud-sync push body. Heavy base64 look images are
 * stripped (they live in Supabase Storage; `imageUrls`/`referenceImageUrl` carry
 * the public URLs). interrupters/settings are NOT synced (local-only config).
 * `messages` is the active session's transcript; cloud-sync gates it by signature
 * and may send null to skip the per-message replace. The active character's
 * gameState is sent for the (device_id, character_id) game_states row.
 */
export function serializeForCloud(state: AppState) {
  const gs = state.gameState;
  return {
    saveId: state.saveId,
    activeCharacterId: gs.currentCharacterId,
    characters: state.characters.map((c) => ({
      ...c,
      looks: (c.looks ?? []).map((l) => ({
        ...l,
        images: {},
        referenceImage: undefined,
      })),
    })),
    gameState: {
      affinity: gs.affinity,
      jealousy: gs.jealousy,
      currentCharacterId: gs.currentCharacterId,
      turnCount: gs.turnCount,
      phase: gs.phase,
      onboardingTurn: gs.onboardingTurn,
    },
    messages: gs.messages,
  };
}
