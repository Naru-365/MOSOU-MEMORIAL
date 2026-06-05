'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  /** Replace synced data fields (characters/interrupters/settings/gameState) from a cloud save. */
  applyCloudData: (data: unknown) => void;

  // Full reset
  resetAll: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const generateSaveId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${generateId()}${generateId()}`.replace(/[^a-z0-9]/gi, '').slice(0, 32);

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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      characters: [],
      interrupters: defaultInterrupters,
      settings: initialSettings,
      gameState: initialGameState,
      saveId: generateSaveId(),

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
        const d = data as Partial<
          Pick<AppState, 'characters' | 'interrupters' | 'settings' | 'gameState'>
        >;
        set((state) => ({
          characters: Array.isArray(d.characters)
            ? (d.characters as Character[])
            : state.characters,
          interrupters: Array.isArray(d.interrupters)
            ? (d.interrupters as Interrupter[])
            : state.interrupters,
          settings: d.settings
            ? { ...state.settings, ...(d.settings as AppSettings) }
            : state.settings,
          gameState: d.gameState
            ? {
                ...state.gameState,
                ...(d.gameState as GameState),
                isGeneratingLook: false,
              }
            : state.gameState,
        }));
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
        const newMessage: Message = {
          id: generateId(),
          ...messageData,
          timestamp: Date.now(),
        };
        set((state) => ({
          gameState: {
            ...state.gameState,
            messages: [...state.gameState.messages, newMessage],
          },
        }));
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
        }));
      },
    }),
    {
      name: 'mosou-memorial-storage',
      version: 3,
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
        p.gameState = {
          ...initialGameState,
          ...prevGame,
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
 * Builds the cloud-sync payload from the store state: the same data fields that
 * persist locally, with heavy base64 look images stripped (those live in
 * Supabase Storage; `imageUrls`/`referenceImageUrl` survive via `...l`). The
 * `saveId` is excluded — it is the row key, not part of the saved data.
 */
export function serializeForCloud(state: AppState) {
  return {
    characters: state.characters.map((c) => ({
      ...c,
      looks: (c.looks ?? []).map((l) => ({
        ...l,
        images: {},
        referenceImage: undefined,
      })),
    })),
    interrupters: state.interrupters,
    settings: state.settings,
    gameState: { ...state.gameState, isGeneratingLook: false },
  };
}
