'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character, GameState, Message } from './types';

interface AppState {
  // Characters
  characters: Character[];
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'imageUrl'>) => Character;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharacter: (id: string) => Character | undefined;

  // Game state
  gameState: GameState;
  setCurrentCharacter: (characterId: string | null) => void;
  updateAffinity: (change: number) => void;
  updateJealousy: (change: number) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  resetGameState: () => void;

  // Full reset
  resetAll: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const getImageUrl = (appearance: string): string => {
  // Placeholder images based on appearance type
  const appearanceMap: Record<string, string> = {
    '清楚系': '/images/characters/seiso.png',
    'ギャル系': '/images/characters/gal.png',
    'ナチュラル': '/images/characters/natural.png',
  };
  return appearanceMap[appearance] || '/images/characters/default.png';
};

const initialGameState: GameState = {
  affinity: 50,
  jealousy: 0,
  currentCharacterId: null,
  messages: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      characters: [],

      addCharacter: (characterData) => {
        const newCharacter: Character = {
          id: generateId(),
          ...characterData,
          imageUrl: getImageUrl(characterData.appearance),
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
              ? {
                  ...char,
                  ...updates,
                  imageUrl: updates.appearance ? getImageUrl(updates.appearance) : char.imageUrl,
                  updatedAt: Date.now(),
                }
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

      gameState: initialGameState,

      setCurrentCharacter: (characterId) => {
        set((state) => ({
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
            affinity: Math.max(0, Math.min(100, state.gameState.affinity + change)),
          },
        }));
      },

      updateJealousy: (change) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            jealousy: Math.max(0, Math.min(100, state.gameState.jealousy + change)),
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
          gameState: {
            ...state.gameState,
            messages: [],
          },
        }));
      },

      resetGameState: () => {
        set({ gameState: initialGameState });
      },

      resetAll: () => {
        set({
          characters: [],
          gameState: initialGameState,
        });
      },
    }),
    {
      name: 'mosou-memorial-storage',
    }
  )
);
