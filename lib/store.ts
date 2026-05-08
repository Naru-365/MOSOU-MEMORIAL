'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppSettings,
  Character,
  GameState,
  Interrupter,
  Message,
} from './types';
import { defaultInterrupters } from './defaults';

interface AppState {
  // Characters
  characters: Character[];
  addCharacter: (
    character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'imageUrl'>
  ) => Character;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharacter: (id: string) => Character | undefined;

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
  setCurrentCharacter: (characterId: string | null) => void;
  updateAffinity: (change: number) => void;
  updateJealousy: (change: number) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  incrementTurn: () => void;
  setActiveInterrupter: (id: string | null) => void;
  resetGameState: () => void;

  // Full reset
  resetAll: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const initialGameState: GameState = {
  affinity: 50,
  jealousy: 0,
  currentCharacterId: null,
  activeInterrupterId: null,
  messages: [],
  turnCount: 0,
};

const initialSettings: AppSettings = {
  userName: 'プレイヤー',
  assetMode: 'image',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      characters: [],
      interrupters: defaultInterrupters,
      settings: initialSettings,
      gameState: initialGameState,

      addCharacter: (characterData) => {
        const newCharacter: Character = {
          id: generateId(),
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

      setCurrentCharacter: (characterId) => {
        set(() => ({
          gameState: {
            ...initialGameState,
            currentCharacterId: characterId,
          },
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
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (!persisted || typeof persisted !== 'object') return persisted;
        const p = persisted as Record<string, unknown>;
        if (version < 2) {
          const prevGame = (p.gameState ?? {}) as Partial<GameState>;
          return {
            ...p,
            interrupters:
              Array.isArray(p.interrupters) && p.interrupters.length > 0
                ? p.interrupters
                : defaultInterrupters,
            settings: (p.settings as AppSettings) ?? initialSettings,
            gameState: {
              ...initialGameState,
              ...prevGame,
              activeInterrupterId: prevGame.activeInterrupterId ?? null,
              turnCount: prevGame.turnCount ?? 0,
            },
          };
        }
        return p;
      },
    }
  )
);
