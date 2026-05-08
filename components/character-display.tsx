'use client';

import { useEffect, useState } from 'react';
import type { AssetMode, Character, Emotion } from '@/lib/types';
import { getCharacterAsset } from '@/lib/character-asset';
import { cn } from '@/lib/utils';

interface CharacterDisplayProps {
  character: Character;
  emotion?: Emotion;
  mode?: AssetMode;
  className?: string;
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
  showInitialFallback = true,
}: CharacterDisplayProps) {
  const asset = getCharacterAsset(character, emotion, mode);
  const [errored, setErrored] = useState(false);

  // Reset the error state when the resolved asset path changes (emotion / mode swap)
  useEffect(() => {
    setErrored(false);
  }, [asset.src]);

  if (errored) {
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
  }

  if (mode === 'video') {
    return (
      <video
        key={asset.src}
        src={asset.src}
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
      key={asset.src}
      src={asset.src}
      alt={`${character.name} (${emotion})`}
      className={cn('object-cover', className)}
      onError={() => setErrored(true)}
    />
  );
}
