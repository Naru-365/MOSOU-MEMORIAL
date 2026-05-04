'use client';

import { useEffect, useState } from 'react';
import { Heart, Swords } from 'lucide-react';

// CSS keyframes を1回だけ head に注入する
const STYLE_ID = 'story-sprite-keyframes';
function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes spriteFloat {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-8px); }
    }
    @keyframes spriteTalk {
      0%, 100% { transform: translateY(-4px) scale(1.00); }
      25%       { transform: translateY(-8px) scale(1.03); }
      75%       { transform: translateY(-6px) scale(1.01); }
    }
    @keyframes spriteEnter {
      from { opacity: 0; transform: translateY(24px) scale(0.92); }
      to   { opacity: 1; transform: translateY(0px)  scale(1.00); }
    }
    @keyframes spriteDim {
      to { filter: brightness(0.55) saturate(0.6); }
    }
  `;
  document.head.appendChild(style);
}

interface Props {
  name: string;
  imageUrl?: string;
  role: 'lover' | 'interrupter';
  /** 'speaking' | 'idle' | 'hidden' */
  state: 'speaking' | 'idle' | 'hidden';
}

export function StoryCharacterSprite({ name, imageUrl, role, state }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectKeyframes();
    // 少し遅らせてエントランスアニメーションを確実に動かす
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isLover = role === 'lover';
  const isTalking = state === 'speaking';
  const isHidden = state === 'hidden';

  // アニメーション設定
  const animStyle: React.CSSProperties = {
    animation: !mounted
      ? 'spriteEnter 0.5s ease-out forwards'
      : isTalking
      ? 'spriteTalk 1.2s ease-in-out infinite'
      : 'spriteFloat 3.2s ease-in-out infinite',
    transition: 'filter 0.4s ease, opacity 0.4s ease, transform 0.3s ease',
    filter: isTalking
      ? 'brightness(1) saturate(1.1) drop-shadow(0 0 12px rgba(255,180,200,0.5))'
      : isHidden
      ? 'brightness(0.45) saturate(0.4)'
      : 'brightness(0.7) saturate(0.7)',
    opacity: isHidden ? 0.5 : 1,
  };

  const ringColor = isLover ? '#ec4899' : '#ef4444';
  const ringStyle: React.CSSProperties = isTalking
    ? {
        boxShadow: `0 0 0 3px ${ringColor}40, 0 0 20px ${ringColor}30`,
        transition: 'box-shadow 0.3s ease',
      }
    : { transition: 'box-shadow 0.3s ease' };

  const hasImage = imageUrl && !imageUrl.startsWith('/images/');

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: 100 }}>
      {/* スプライト本体 */}
      <div style={animStyle}>
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ width: 88, height: 132, ...ringStyle }}
        >
          {hasImage ? (
            // 実画像
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            // プレースホルダー（イニシャル）
            <div
              className={`w-full h-full flex flex-col items-center justify-center gap-2 ${
                isLover
                  ? 'bg-gradient-to-b from-pink-100 to-rose-200 dark:from-pink-900 dark:to-rose-800'
                  : 'bg-gradient-to-b from-red-100 to-orange-200 dark:from-red-900 dark:to-orange-800'
              }`}
            >
              {isLover ? (
                <Heart className="w-6 h-6 text-pink-500 fill-pink-400" />
              ) : (
                <Swords className="w-6 h-6 text-red-500" />
              )}
              <span
                className={`text-3xl font-bold ${
                  isLover ? 'text-pink-600 dark:text-pink-300' : 'text-red-600 dark:text-red-300'
                }`}
              >
                {name.charAt(0)}
              </span>
            </div>
          )}

          {/* 話者ハイライトグロウ */}
          {isTalking && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isLover
                  ? 'linear-gradient(to bottom, transparent 60%, rgba(236,72,153,0.15))'
                  : 'linear-gradient(to bottom, transparent 60%, rgba(239,68,68,0.15))',
              }}
            />
          )}
        </div>
      </div>

      {/* 名前ラベル */}
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-all duration-300 ${
          isTalking
            ? isLover
              ? 'bg-primary/15 text-primary'
              : 'bg-destructive/15 text-destructive'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {name}
      </span>
    </div>
  );
}
