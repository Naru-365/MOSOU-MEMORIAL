'use client';

import Link from 'next/link';
import { BookOpen, Lock, CheckCircle2, Heart, Swords, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BottomNavigation } from '@/components/bottom-navigation';
import { storyChapters } from '@/lib/story-data';
import { Card } from '@/components/ui/card';

export default function StoryPage() {
  const storyProgress = useAppStore((state) => state.storyProgress);
  const getLoverCharacter = useAppStore((state) => state.getLoverCharacter);
  const getInterrupterCharacter = useAppStore((state) => state.getInterrupterCharacter);

  const lover = getLoverCharacter();
  const interrupter = getInterrupterCharacter();
  const { storyAffinity, completedChapterIds } = storyProgress;

  const hasRequiredCharacters = lover && interrupter;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center px-4 h-14 max-w-md mx-auto">
          <h1 className="text-lg font-bold text-foreground">ストーリー</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto flex flex-col gap-6">
        {/* Affinity bar */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">ストーリー好感度</span>
            <span className="text-sm font-bold text-primary">{storyAffinity} pt</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (storyAffinity / 40) * 100)}%` }}
            />
          </div>
        </div>

        {/* Cast */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">登場キャラクター</h2>
          {hasRequiredCharacters ? (
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{lover!.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-primary fill-primary" />
                    <span className="text-xs text-muted-foreground">恋愛相手</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{lover!.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-destructive">{interrupter!.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <Swords className="w-3 h-3 text-destructive" />
                    <span className="text-xs text-muted-foreground">邪魔者</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{interrupter!.name}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                ストーリーを始めるには「恋愛相手」と「邪魔者」をそれぞれ1人ずつ作成してください。
              </p>
              <Link
                href="/characters"
                className="text-sm text-primary font-medium hover:underline"
              >
                キャラクター設定へ →
              </Link>
            </div>
          )}
        </div>

        {/* Chapter list */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">章一覧</h2>
          {storyChapters.map((chapter, index) => {
            const isCompleted = completedChapterIds.includes(chapter.id);
            const isUnlocked = hasRequiredCharacters && storyAffinity >= chapter.requiredAffinity;
            const isLocked = !isUnlocked;

            return (
              <Card
                key={chapter.id}
                className={`overflow-hidden transition-all ${isLocked ? 'opacity-60' : 'hover:shadow-md'}`}
              >
                {isLocked ? (
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">第{chapter.number}章</p>
                      <p className="font-semibold text-foreground">{chapter.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {chapter.requiredAffinity > 0
                          ? `好感度 ${chapter.requiredAffinity}pt 以上で解放`
                          : 'キャラクターを設定してください'}
                      </p>
                    </div>
                    <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ) : (
                  <Link href={`/story/${chapter.id}`} className="flex items-center gap-4 p-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCompleted ? 'bg-primary/10' : 'bg-secondary'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">第{chapter.number}章</p>
                      <p className="font-semibold text-foreground">{chapter.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{chapter.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
