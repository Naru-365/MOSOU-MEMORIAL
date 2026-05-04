'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character, CharacterRole, GameState, Message, StoryProgress } from './types';

interface AppState {
  // Characters
  characters: Character[];
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> & { imageUrl?: string }) => Character;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharacter: (id: string) => Character | undefined;
  getLoverCharacter: () => Character | undefined;
  getInterrupterCharacter: () => Character | undefined;

  // Game state
  gameState: GameState;
  setCurrentCharacter: (characterId: string | null) => void;
  updateAffinity: (change: number) => void;
  updateJealousy: (change: number) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  resetGameState: () => void;

  // Story progress
  storyProgress: StoryProgress;
  updateStoryAffinity: (change: number) => void;
  completeChapter: (chapterId: string) => void;
  resetStoryProgress: () => void;

  // Full reset
  resetAll: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const getImageUrl = (appearance: string): string => {
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

const initialStoryProgress: StoryProgress = {
  completedChapterIds: [],
  storyAffinity: 0,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      characters: [],

      addCharacter: (characterData) => {
        const newCharacter: Character = {
          id: generateId(),
          ...characterData,
          imageUrl: characterData.imageUrl || getImageUrl(characterData.appearance),
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

      getLoverCharacter: () => {
        return get().characters.find((char) => char.role === '恋愛相手');
      },

      getInterrupterCharacter: () => {
        return get().characters.find((char) => char.role === '邪魔者');
      },

      gameState: initialGameState,

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

      storyProgress: initialStoryProgress,

      updateStoryAffinity: (change) => {
        set((state) => ({
          storyProgress: {
            ...state.storyProgress,
            storyAffinity: Math.max(0, state.storyProgress.storyAffinity + change),
          },
        }));
      },

      completeChapter: (chapterId) => {
        set((state) => ({
          storyProgress: {
            ...state.storyProgress,
            completedChapterIds: state.storyProgress.completedChapterIds.includes(chapterId)
              ? state.storyProgress.completedChapterIds
              : [...state.storyProgress.completedChapterIds, chapterId],
          },
        }));
      },

      resetStoryProgress: () => {
        set({ storyProgress: initialStoryProgress });
      },

      resetAll: () => {
        set({
          characters: [],
          gameState: initialGameState,
          storyProgress: initialStoryProgress,
        });
      },
    }),
    {
      name: 'mosou-memorial-storage',
      // 既存データの role が undefined の場合に '恋愛相手' をデフォルトにする
      merge: (persisted: unknown, current) => {
        const persistedState = persisted as Partial<AppState>;
        return {
          ...current,
          ...persistedState,
          characters: (persistedState.characters ?? []).map((c: Character) => ({
            ...c,
            role: c.role ?? ('恋愛相手' as CharacterRole),
          })),
        };
      },
    }
  )
);
