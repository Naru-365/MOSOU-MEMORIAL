'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BottomNavigation } from '@/components/bottom-navigation';
import { CharacterDisplay } from '@/components/character-display';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Emotion, InterrupterEmotion } from '@/lib/types';
import type {
  ChatApiError,
  ChatApiRequest,
  ChatApiResponse,
} from '@/lib/api-types';

const HEROINE_EMOTIONS: Emotion[] = [
  'neutral',
  'happy',
  'tsun',
  'blush',
  'angry',
  'surprised',
  'laugh',
  'sad',
];

function isHeroineEmotion(e: string): e is Emotion {
  return (HEROINE_EMOTIONS as string[]).includes(e);
}

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');

  const {
    gameState,
    characters,
    interrupters,
    settings,
    addMessage,
    updateAffinity,
    updateJealousy,
    incrementTurn,
  } = useAppStore();

  const currentCharacter = characters.find(
    (c) => c.id === gameState.currentCharacterId
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.messages]);

  const handleSend = async () => {
    if (!currentCharacter) return;
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setErrorMsg(null);
    setIsSending(true);
    setInput('');

    addMessage({ role: 'user', content: trimmed });

    const requestBody: ChatApiRequest = {
      character: currentCharacter,
      interrupters,
      gameState,
      userMessage: trimmed,
      userName: settings.userName,
      history: gameState.messages.slice(-10),
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ChatApiError | null;
        throw new Error(err?.error ?? `API error: ${res.status}`);
      }

      const data = (await res.json()) as ChatApiResponse;

      updateAffinity(data.affinityChange);
      updateJealousy(data.jealousyChange);
      incrementTurn();

      if (data.speaker === 'character' && isHeroineEmotion(data.emotion)) {
        setCurrentEmotion(data.emotion);
      } else if (data.speaker === 'character') {
        setCurrentEmotion('neutral');
      }

      addMessage({
        role: data.speaker,
        content: data.reply,
        emotion: data.emotion as Emotion | InterrupterEmotion,
        interrupterId: data.interrupterId,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'API呼び出し失敗';
      setErrorMsg(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter to send (mobile keyboards usually have Enter as newline)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
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
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
              <CharacterDisplay
                character={currentCharacter}
                emotion={currentEmotion}
                mode={settings.assetMode}
                className="w-full h-full"
              />
            </div>
            <div>
              <h1 className="font-bold text-foreground">
                {currentCharacter.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                {currentCharacter.personality} / {currentEmotion}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full">
            <Heart className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-foreground">
              {gameState.affinity}
            </span>
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

      {/* Character hero (placeholder/throwaway styling — UI rewrite incoming) */}
      <div className="px-4 pt-4 max-w-md w-full mx-auto">
        <div className="aspect-[3/4] rounded-2xl bg-secondary overflow-hidden">
          <CharacterDisplay
            character={currentCharacter}
            emotion={currentEmotion}
            mode={settings.assetMode}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-44">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          {gameState.messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                {currentCharacter.name}に話しかけてみましょう
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
                    <span className="text-xs font-medium">
                      邪魔キャラ乱入!
                    </span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-card text-muted-foreground border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">考え中…</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="text-center text-xs text-destructive py-2">
              {errorMsg}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Composer */}
      <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3">
        <div className="max-w-md mx-auto flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${currentCharacter.name}に話しかける…`}
            rows={1}
            className="flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl bg-card"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="h-11 w-11 rounded-full p-0 shrink-0"
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
    </div>
  );
}
