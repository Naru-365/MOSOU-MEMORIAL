'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BottomNavigation } from '@/components/bottom-navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  shouldTriggerInterruption,
  getRandomInterrupterType,
  getInterrupterMessage,
} from '@/lib/chat-logic';
import type { AIChatResponse, Emotion, InterrupterType } from '@/lib/types';
import { InterruptionModal } from '@/components/interruption-modal';

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isInterrupting, setIsInterrupting] = useState(false);
  const [interrupterType, setInterrupterType] = useState<InterrupterType | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    gameState,
    characters,
    addMessage,
    updateAffinity,
    updateJealousy,
    setCurrentEmotion,
  } = useAppStore();

  const currentCharacter = characters.find(
    (c) => c.id === gameState.currentCharacterId
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.messages]);

  const characterImage =
    currentCharacter?.images?.[gameState.currentEmotion] ||
    currentCharacter?.images?.neutral;

  const handleSend = async () => {
    if (!currentCharacter || !input.trim() || isSending) return;
    const text = input.trim();
    setInput('');
    setErrorMessage(null);
    setIsSending(true);

    addMessage({ role: 'user', content: text });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: currentCharacter,
          affinity: gameState.affinity,
          jealousy: gameState.jealousy,
          history: gameState.messages,
          userMessage: text,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data: AIChatResponse = await res.json();

      updateAffinity(data.affinityDelta);
      updateJealousy(2);
      setCurrentEmotion(data.emotion);

      addMessage({
        role: 'character',
        content: data.message,
        emotion: data.emotion,
      });

      const newJealousy = gameState.jealousy + 2;
      if (shouldTriggerInterruption(newJealousy)) {
        const type = getRandomInterrupterType();
        setInterrupterType(type);
        setIsInterrupting(true);
        addMessage({ role: 'interrupter', content: getInterrupterMessage(type) });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'リクエストに失敗しました';
      setErrorMessage(msg);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleDismissInterruption = () => {
    setIsInterrupting(false);
    setInterrupterType(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
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
            <CharacterAvatar
              imageUrl={characterImage}
              name={currentCharacter.name}
              emotion={gameState.currentEmotion}
              size="sm"
            />
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

      {/* Large character portrait */}
      {characterImage && (
        <div className="flex justify-center px-4 pt-4">
          <div className="relative w-40 h-40 rounded-2xl overflow-hidden shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={characterImage}
              alt={`${currentCharacter.name} - ${gameState.currentEmotion}`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-card border border-border rounded-bl-md">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3">
        <div className="max-w-md mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${currentCharacter.name}に話しかける...`}
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 max-h-32"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-0 flex items-center justify-center"
            aria-label="送信"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      <BottomNavigation />

      <InterruptionModal
        isOpen={isInterrupting}
        interrupterType={interrupterType}
        onDismiss={handleDismissInterruption}
      />
    </div>
  );
}

function CharacterAvatar({
  imageUrl,
  name,
  emotion,
  size,
}: {
  imageUrl?: string;
  name: string;
  emotion: Emotion;
  size: 'sm' | 'lg';
}) {
  const dim = size === 'sm' ? 'w-10 h-10' : 'w-32 h-32';
  if (imageUrl) {
    return (
      <div className={cn(dim, 'rounded-full overflow-hidden bg-secondary')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`${name} - ${emotion}`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className={cn(dim, 'rounded-full bg-secondary flex items-center justify-center')}>
      <span className={cn('text-muted-foreground', size === 'sm' ? 'text-lg' : 'text-5xl')}>
        {name.charAt(0)}
      </span>
    </div>
  );
}
