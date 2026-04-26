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
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <h1 className="text-4xl font-bold text-accent tracking-wider">
              妄想メモリアル
            </h1>
            <span className="absolute -top-2 -right-8 text-[10px] font-semibold tracking-widest text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
              BETA
            </span>
          </div>
          <p className="text-lg text-muted-foreground tracking-widest">
            MOSOU MEMORIAL
          </p>
        </div>

        {/* Decorative element */}
        <div className="w-24 h-0.5 bg-primary rounded-full" />

        {/* Start Button */}
        <Link href="/characters" className="w-full max-w-xs">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-medium rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
          >
            はじめる
          </Button>
        </Link>

        {/* Footer Icons */}
        <div className="flex items-center gap-6 mt-8">
          <button
            className="p-3 rounded-full bg-card hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="設定"
          >
            <Settings className="w-6 h-6 text-accent" />
          </button>

          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <AlertDialogTrigger asChild>
              <button
                className="p-3 rounded-full bg-card hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
