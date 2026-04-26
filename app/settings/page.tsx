'use client';

import { useState } from 'react';
import { RotateCcw, Info, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { useAppStore } from '@/lib/store';
import { BottomNavigation } from '@/components/bottom-navigation';

export default function SettingsPage() {
  const { resetAll, resetGameState, characters } = useAppStore();
  const [resetAllDialogOpen, setResetAllDialogOpen] = useState(false);
  const [resetGameDialogOpen, setResetGameDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-center px-4 h-14 max-w-md mx-auto">
          <h1 className="text-lg font-bold text-foreground">設定</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-md mx-auto flex flex-col gap-4">
        {/* Game Info */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">ゲーム情報</h2>
              <p className="text-sm text-muted-foreground">妄想メモリアル</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>キャラクター: {characters.length}人</span>
            </div>
          </div>
        </Card>

        {/* Reset Options */}
        <Card className="p-4">
          <h2 className="font-bold text-foreground mb-4">リセット</h2>

          <div className="flex flex-col gap-3">
            <AlertDialog open={resetGameDialogOpen} onOpenChange={setResetGameDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl justify-start gap-3 border-border text-foreground"
                >
                  <RotateCcw className="w-5 h-5" />
                  ゲームをリセット
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>ゲームをリセットしますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    好感度とチャット履歴がリセットされます。キャラクターは保持されます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      resetGameState();
                      setResetGameDialogOpen(false);
                    }}
                    className="rounded-full bg-primary hover:bg-primary/90"
                  >
                    リセット
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={resetAllDialogOpen} onOpenChange={setResetAllDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl justify-start gap-3 border-destructive text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="w-5 h-5" />
                  すべてのデータをリセット
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>すべてのデータをリセットしますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    すべてのキャラクターとゲームデータが削除されます。この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      resetAll();
                      setResetAllDialogOpen(false);
                    }}
                    className="rounded-full bg-destructive hover:bg-destructive/90"
                  >
                    リセット
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>

        {/* About */}
        <Card className="p-4">
          <h2 className="font-bold text-foreground mb-2">このゲームについて</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            妄想メモリアルは、実写風キャラクターとの恋愛体験に、メタ的な「邪魔キャラ」が介入するシミュレーションゲームです。
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            好感度を上げると邪魔キャラの嫉妬度も上がり、介入が発生しやすくなります。
          </p>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
}
