'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BottomNavigation } from '@/components/bottom-navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  standardChoices,
  getCharacterResponse,
  shouldTriggerInterruption,
  getRandomInterrupterType,
  getInterrupterMessage,
  getModifiedChoices,
  calculateJealousyIncrease,
} from '@/lib/chat-logic';
import type { Choice, InterrupterType } from '@/lib/types';
import { InterruptionModal } from '@/components/interruption-modal';

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInterrupting, setIsInterrupting] = useState(false);
  const [interrupterType, setInterrupterType] = useState<InterrupterType | null>(null);
  const [currentChoices, setCurrentChoices] = useState<Choice[]>(standardChoices);

  const {
    gameState,
    characters,
    addMessage,
    updateAffinity,
    updateJealousy,
    setCurrentCharacter,
  } = useAppStore();

  const currentCharacter = characters.find(
    (c) => c.id === gameState.currentCharacterId
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.messages]);

  // Reset choices when interruption ends
  useEffect(() => {
    if (!isInterrupting) {
      setCurrentChoices(standardChoices);
    }
  }, [isInterrupting]);

  const handleChoice = (choice: Choice) => {
    if (!currentCharacter) return;

    // Add user message
    addMessage({
      role: 'user',
      content: choice.label,
    });

    // Update affinity
    updateAffinity(choice.affinityChange);

    // Update jealousy
    const jealousyChange = calculateJealousyIncrease(choice.value);
    updateJealousy(jealousyChange);

    // Check for interruption
    if (shouldTriggerInterruption(gameState.jealousy + jealousyChange)) {
      const type = getRandomInterrupterType();
      setInterrupterType(type);
      setIsInterrupting(true);
      setCurrentChoices(getModifiedChoices(type));

      // Add interrupter message
      addMessage({
        role: 'interrupter',
        content: getInterrupterMessage(type),
      });
    } else {
      // Add character response
      setTimeout(() => {
        addMessage({
          role: 'character',
          content: getCharacterResponse(
            gameState.affinity + choice.affinityChange,
            currentCharacter
          ),
        });
      }, 500);
    }
  };

  const handleDismissInterruption = () => {
    setIsInterrupting(false);
    setInterrupterType(null);
    setCurrentChoices(standardChoices);

    // Add character response after interruption
    if (currentCharacter) {
      setTimeout(() => {
        addMessage({
          role: 'character',
          content: getCharacterResponse(gameState.affinity, currentCharacter),
        });
      }, 300);
    }
  };

  if (!currentCharacter) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4 mx-auto">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              チャット相手を選んでください
            </p>
            <Link
              href="/characters"
              className="inline-block px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium min-h-[44px]"
            >
              キャラクター一覧へ
            </Link>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-lg text-muted-foreground">
                {currentCharacter.name.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="font-bold text-foreground">{currentCharacter.name}</h1>
              <p className="text-xs text-muted-foreground">{currentCharacter.personality}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full">
            <Heart className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-foreground">{gameState.affinity}</span>
          </div>
        </div>

        {/* Jealousy indicator (only show when above 30) */}
        {gameState.jealousy >= 30 && (
          <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-destructive">
                嫉妬度: {gameState.jealousy}%
              </span>
              <div className="flex-1 h-1.5 bg-destructive/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-destructive rounded-full transition-all duration-300"
                  style={{ width: `${gameState.jealousy}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-48">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          {gameState.messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                {currentCharacter.name}との会話を始めましょう
              </p>
            </div>
          )}

          {gameState.messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] px-4 py-3 rounded-2xl',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : message.role === 'interrupter'
                    ? 'bg-destructive/10 text-destructive border border-destructive/30 rounded-bl-md'
                    : 'bg-card text-foreground border border-border rounded-bl-md'
                )}
              >
                {message.role === 'interrupter' && (
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-xs font-medium">邪魔キャラ</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Choice Buttons */}
      <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          {currentChoices.map((choice) => (
            <Button
              key={choice.value}
              onClick={() => handleChoice(choice)}
              variant={choice.value === 'positive' ? 'default' : 'outline'}
              className={cn(
                'h-12 rounded-xl font-medium',
                choice.value === 'positive'
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : choice.value === 'negative'
                  ? 'border-destructive/50 text-destructive hover:bg-destructive/10'
                  : 'border-border text-foreground hover:bg-secondary'
              )}
            >
              {choice.label}
            </Button>
          ))}
        </div>
      </div>

      <BottomNavigation />

      {/* Interruption Modal */}
      <InterruptionModal
        isOpen={isInterrupting}
        interrupterType={interrupterType}
        onDismiss={handleDismissInterruption}
      />
    </div>
  );
}
