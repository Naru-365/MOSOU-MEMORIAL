'use client';

import { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import type { CharacterImages, Emotion } from '@/lib/types';
import { EMOTIONS, EMOTION_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  value: CharacterImages;
  onChange: (next: CharacterImages) => void;
}

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.85;

async function fileToResizedDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('image load failed'));
    el.src = dataUrl;
  });

  const ratio = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export function CharacterImageUploader({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">立ち絵（5感情）</span>
        <span className="text-xs text-muted-foreground">タップで画像選択</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {EMOTIONS.map((emotion) => (
          <ImageSlot
            key={emotion}
            emotion={emotion}
            url={value[emotion]}
            onSelect={async (file) => {
              const dataUrl = await fileToResizedDataUrl(file);
              onChange({ ...value, [emotion]: dataUrl });
            }}
            onClear={() => {
              const next = { ...value };
              delete next[emotion];
              onChange(next);
            }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        最低でも「ニュートラル」を1枚アップロードしてください。未設定の感情は ニュートラル画像で代用されます。
      </p>
    </div>
  );
}

function ImageSlot({
  emotion,
  url,
  onSelect,
  onClear,
}: {
  emotion: Emotion;
  url?: string;
  onSelect: (file: File) => Promise<void>;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setErr(null);
    setBusy(true);
    try {
      await onSelect(file);
    } catch (e) {
      setErr('読み込み失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-full aspect-square">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-full h-full rounded-xl border-2 border-dashed border-border bg-secondary/50 flex items-center justify-center overflow-hidden transition-colors',
            url && 'border-solid',
            !url && 'hover:bg-secondary'
          )}
          aria-label={`${EMOTION_LABELS[emotion]}の画像を選択`}
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={EMOTION_LABELS[emotion]} className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
        {url && !busy && (
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
            aria-label={`${EMOTION_LABELS[emotion]}の画像を削除`}
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) handleFile(file);
          }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {EMOTION_LABELS[emotion]}
      </span>
      {err && <span className="text-[10px] text-destructive">{err}</span>}
    </div>
  );
}
