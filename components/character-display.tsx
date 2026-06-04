'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { AssetMode, Character, Emotion, Look } from '@/lib/types';
import { resolveCharacterAsset } from '@/lib/character-asset';
import { cn } from '@/lib/utils';

interface CharacterDisplayProps {
  character: Character;
  emotion?: Emotion;
  mode?: AssetMode;
  className?: string;
  /** Active look (generated images live here). Null/undefined => formless. */
  look?: Look | null;
  /**
   * If true, render a name initial fallback when the asset fails to load.
   * If false, render an empty box (used when caller overlays its own fallback).
   */
  showInitialFallback?: boolean;
}

export function CharacterDisplay({
  character,
  emotion = 'neutral',
  mode = 'image',
  className,
  look,
  showInitialFallback = true,
}: CharacterDisplayProps) {
  const asset = resolveCharacterAsset(character, look ?? null, emotion, mode);
  const [errored, setErrored] = useState(false);

  // Reset the error state when the resolved source changes (emotion / look swap)
  useEffect(() => {
    setErrored(false);
  }, [asset.generatedSrc, asset.pathSrc]);

  // Initial / empty fallback shared by image error and formless states.
  const renderInitialFallback = () => {
    if (!showInitialFallback) return <div className={className} aria-hidden />;
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-secondary text-muted-foreground',
          className
        )}
      >
        <span className="text-5xl font-medium">
          {character.name.charAt(0)}
        </span>
      </div>
    );
  };

  if (errored) {
    return renderInitialFallback();
  }

  // Formless: soft gradient placeholder with a faded initial + sparkle.
  if (asset.formless) {
    if (!showInitialFallback) return <div className={className} aria-hidden />;
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-secondary to-secondary/40 text-muted-foreground',
          className
        )}
      >
        <span className="text-5xl font-medium opacity-30">
          {character.name.charAt(0)}
        </span>
        <Sparkles className="w-6 h-6 opacity-60" />
        <span className="text-xs opacity-70">姿はまだ…</span>
      </div>
    );
  }

  // Generated data URL takes priority over legacy static path.
  const src = asset.generatedSrc ?? asset.pathSrc;
  if (!src) {
    return renderInitialFallback();
  }

  if (mode === 'video') {
    // Video uses the legacy static path only.
    return (
      <video
        key={src}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className={cn('object-cover', className)}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={`${character.name} (${emotion})`}
      className={cn('object-cover', className)}
      onError={() => setErrored(true)}
    />
  );
}
