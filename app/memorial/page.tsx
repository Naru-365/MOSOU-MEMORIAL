'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookHeart, Download, Heart, Loader2, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BottomNavigation } from '@/components/bottom-navigation';
import { CharacterDisplay } from '@/components/character-display';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  countLookExpressions,
  formatLookDate,
  getLookImageSrc,
  lookAttributeChips,
  sortLooksNewestFirst,
} from '@/lib/memorial';
import { composeShareImage, downloadFile } from '@/lib/share-image';
import type { Character, Look } from '@/lib/types';

export default function MemorialPage() {
  const characters = useAppStore((state) => state.characters);
  const withLooks = useMemo(
    () => characters.filter((c) => (c.looks?.length ?? 0) > 0),
    [characters]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    withLooks.find((c) => c.id === selectedId) ?? withLooks[0] ?? null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2 px-4 h-14 max-w-md mx-auto">
          <BookHeart className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">メモリアル</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto flex flex-col gap-6">
        {withLooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <BookHeart className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">
              まだ思い出がありません
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ヒロインが姿を現すと、ここに記録が残っていくよ
            </p>
            <Link
              href="/characters"
              className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium min-h-[44px] flex items-center"
            >
              キャラクター一覧へ
            </Link>
          </div>
        ) : (
          <>
            {withLooks.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {withLooks.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    aria-pressed={selected?.id === c.id}
                    className={cn(
                      'px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap',
                      selected?.id === c.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border'
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {selected && <CharacterMemorial character={selected} />}
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}

function CharacterMemorial({ character }: { character: Character }) {
  const looks = sortLooksNewestFirst(character.looks ?? []);
  const memory = character.memory;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-foreground">{character.name}</h2>
        <span className="text-xs text-muted-foreground">
          {looks.length}つの姿
        </span>
      </div>

      {/* Only the narrative summary is shown. The raw facts list is her
          internal memory data — displaying it as bullet points turns her
          inner life into a database readout and breaks immersion (Claude
          review). Facts stay in the prompt, out of the UI. */}
      {memory && memory.summary && (
        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            思い出ノート
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {memory.summary}
          </p>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {looks.map((look) => (
          <LookCard
            key={look.id}
            character={character}
            look={look}
            isCurrent={character.currentLookId === look.id}
          />
        ))}
      </ol>
    </section>
  );
}

function LookCard({
  character,
  look,
  isCurrent,
}: {
  character: Character;
  look: Look;
  isCurrent: boolean;
}) {
  const [sharing, setSharing] = useState(false);
  const chips = lookAttributeChips(look);
  const expressions = countLookExpressions(look);
  const src = getLookImageSrc(look);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const blob = await composeShareImage(character.name, look);
      if (blob) {
        const url = URL.createObjectURL(blob);
        downloadFile(url, `memorial-${character.name}-${look.id}.png`);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } else if (src) {
        // Composition failed (e.g. non-CORS image): open the original in a
        // new tab — a cross-origin `download` attribute would be ignored
        // and navigate this tab away from the app.
        window.open(src, '_blank', 'noopener');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <li className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="relative aspect-[3/4] bg-secondary">
        <CharacterDisplay
          character={character}
          emotion="neutral"
          look={look}
          className="w-full h-full"
        />
        {isCurrent && (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            <Heart className="w-3 h-3 fill-current" />
            今の姿
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-bold text-foreground">{look.label}</h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatLookDate(look.createdAt)}
          </span>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
              >
                {chip.label}: {chip.value}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            表情 {expressions} 種
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            disabled={sharing || !src}
            className="rounded-full gap-1.5"
          >
            {sharing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            共有画像を保存
          </Button>
        </div>
      </div>
    </li>
  );
}
