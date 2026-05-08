'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowLeft, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BottomNavigation } from '@/components/bottom-navigation';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { InterrupterArchetype } from '@/lib/types';

const archetypeLabel: Record<InterrupterArchetype, string> = {
  tsukkomi: 'ツッコミ',
  yandere: '束縛',
  meta: 'メタ',
  custom: 'カスタム',
};

export default function InterruptersListPage() {
  const interrupters = useAppStore((s) => s.interrupters);
  const updateInterrupter = useAppStore((s) => s.updateInterrupter);
  const resetInterruptersToDefault = useAppStore(
    (s) => s.resetInterruptersToDefault
  );
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <Link
            href="/settings"
            className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="戻る"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">邪魔者</h1>
          <Link
            href="/interrupters/new"
            className="p-2 rounded-full bg-primary text-primary-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="新規作成"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto flex flex-col gap-3">
        {interrupters.map((i) => (
          <Card key={i.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/interrupters/${i.id}`}
                    className="font-bold text-foreground hover:underline truncate"
                  >
                    {i.name}
                  </Link>
                  <Badge variant="secondary" className="text-xs">
                    {archetypeLabel[i.archetype]}
                  </Badge>
                </div>
                {i.description && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {i.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {i.trigger.minJealousy !== undefined && (
                    <div>嫉妬度 ≥ {i.trigger.minJealousy}</div>
                  )}
                  {i.trigger.everyNTurns !== undefined && (
                    <div>{i.trigger.everyNTurns}ターンごと</div>
                  )}
                  {i.trigger.keywordTriggers &&
                    i.trigger.keywordTriggers.length > 0 && (
                      <div>
                        キーワード: {i.trigger.keywordTriggers.join(', ')}
                      </div>
                    )}
                  <div>
                    出現確率:{' '}
                    {Math.round((i.trigger.baseProbability ?? 0.2) * 100)}%
                  </div>
                </div>
              </div>
              <Switch
                checked={i.enabled}
                onCheckedChange={(checked) =>
                  updateInterrupter(i.id, { enabled: checked })
                }
                aria-label={`${i.name}を有効化`}
              />
            </div>
          </Card>
        ))}

        {interrupters.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              邪魔者がまだいません
            </p>
            <Link
              href="/interrupters/new"
              className="inline-block px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium"
            >
              邪魔者を作成
            </Link>
          </div>
        )}

        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="h-12 rounded-xl mt-4 gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              デフォルトに戻す
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>邪魔者をリセットしますか？</AlertDialogTitle>
              <AlertDialogDescription>
                追加・編集した邪魔者はすべて失われ、デフォルトの3体に戻ります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetInterruptersToDefault();
                  setResetOpen(false);
                }}
                className="rounded-full bg-destructive hover:bg-destructive/90"
              >
                リセット
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <BottomNavigation />
    </div>
  );
}
