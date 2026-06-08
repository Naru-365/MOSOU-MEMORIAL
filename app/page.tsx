'use client';

import Link from 'next/link';
import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function TitleScreen() {
  const resetAll = useAppStore((state) => state.resetAll);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleReset = () => {
    resetAll();
    setResetDialogOpen(false);
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 py-6 overflow-hidden">
      {/* Visible title lives in the key art; keep an accessible heading. */}
      <h1 className="sr-only">妄想メモリアル ― MOSOU MEMORIAL</h1>

      <div className="relative w-full max-w-5xl flex flex-col items-center gap-7">
        {/* Key visual = the title screen. Click anywhere to start (PRESS ANY KEY). */}
        <Link
          href="/characters"
          aria-label="はじめる"
          className="block w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/40 transition-transform duration-300 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/title-key-visual.png"
            alt="妄想メモリアル ― 会話で、相手の姿が変わっていく立ち絵会話シミュレーション"
            className="w-full h-auto select-none"
            draggable={false}
            fetchPriority="high"
          />
        </Link>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Link href="/characters">
            <Button
              size="lg"
              className="h-14 px-12 text-lg font-bold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              はじめる
            </Button>
          </Link>

          <Link
            href="/settings"
            className="p-3 rounded-full bg-card hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shadow"
            aria-label="設定"
          >
            <Settings className="w-6 h-6 text-accent" />
          </Link>

          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <AlertDialogTrigger asChild>
              <button
                className="p-3 rounded-full bg-card hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shadow"
                aria-label="データリセット"
              >
                <RotateCcw className="w-6 h-6 text-accent" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>データをリセットしますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  すべてのキャラクターとゲームデータが削除されます。この操作は取り消せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="rounded-full bg-destructive hover:bg-destructive/90"
                >
                  リセット
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </main>
  );
}
