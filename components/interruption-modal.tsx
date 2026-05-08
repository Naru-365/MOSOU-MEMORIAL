'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Interrupter, InterrupterArchetype } from '@/lib/types';
import { getInterrupterAsset } from '@/lib/character-asset';

interface InterruptionModalProps {
  isOpen: boolean;
  interrupter: Interrupter | null;
  onDismiss: () => void;
}

const archetypeLabel: Record<InterrupterArchetype, string> = {
  tsukkomi: 'ツッコミ系',
  yandere: '束縛系',
  meta: 'メタ系',
  custom: 'カスタム',
};

export function InterruptionModal({
  isOpen,
  interrupter,
  onDismiss,
}: InterruptionModalProps) {
  const [imgErrored, setImgErrored] = useState(false);

  useEffect(() => {
    setImgErrored(false);
  }, [interrupter?.id]);

  if (!isOpen || !interrupter) return null;

  const asset = getInterrupterAsset(interrupter, 'intro');
  const description =
    interrupter.description ?? archetypeLabel[interrupter.archetype];

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
          <div className="w-20 h-20 rounded-full bg-destructive/20 overflow-hidden flex items-center justify-center relative">
            {!imgErrored ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.src}
                alt={interrupter.name}
                className="w-full h-full object-cover"
                onError={() => setImgErrored(true)}
              />
            ) : (
              <UserX className="w-10 h-10 text-destructive" />
            )}
          </div>

          {/* Info */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground mb-1">
              {interrupter.name}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
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
