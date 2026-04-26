'use client';

import { AlertTriangle, X, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InterrupterType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InterruptionModalProps {
  isOpen: boolean;
  interrupterType: InterrupterType | null;
  onDismiss: () => void;
}

const interrupterInfo: Record<InterrupterType, { title: string; description: string }> = {
  'ツッコミ系': {
    title: 'ツッコミ系',
    description: '論理的に否定してくる邪魔キャラ',
  },
  '束縛系': {
    title: '束縛系',
    description: '嫉妬深い邪魔キャラ',
  },
  'メタ系': {
    title: 'メタ系',
    description: 'ゲーム自体に言及する邪魔キャラ',
  },
};

export function InterruptionModal({ isOpen, interrupterType, onDismiss }: InterruptionModalProps) {
  if (!isOpen || !interrupterType) return null;

  const info = interrupterInfo[interrupterType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-destructive/10 px-4 py-3 flex items-center justify-between border-b border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="font-bold text-destructive">介入発生!</span>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 rounded-full hover:bg-destructive/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-destructive" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center gap-4">
          {/* Interrupter Avatar */}
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
            <UserX className="w-10 h-10 text-destructive" />
          </div>

          {/* Info */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground mb-1">
              {info.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {info.description}
            </p>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 rounded-xl p-4 w-full">
            <p className="text-sm text-destructive text-center">
              選択肢が改ざんされています!
            </p>
          </div>

          {/* Dismiss Button */}
          <Button
            onClick={onDismiss}
            className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
          >
            了解
          </Button>
        </div>
      </div>
    </div>
  );
}
