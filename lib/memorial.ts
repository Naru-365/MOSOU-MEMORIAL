import type { Emotion, Look } from './types';

/**
 * Memorial / album helpers (改善3a).
 *
 * Looks were stored as an array but never shown anywhere — the "Memorial"
 * in the title had no screen. These helpers feed the /memorial timeline:
 * one card per confirmed Look, newest first within each character.
 */

/** Best display source for a look: session base64, then persisted URL. */
export function getLookImageSrc(
  look: Look,
  emotion: Emotion = 'neutral'
): string | null {
  return (
    look.images[emotion] ??
    look.images.neutral ??
    look.imageUrls?.[emotion] ??
    look.imageUrls?.neutral ??
    look.referenceImage ??
    look.referenceImageUrl ??
    null
  );
}

/** How many distinct emotion portraits this look actually has. */
export function countLookExpressions(look: Look): number {
  const keys = new Set<string>([
    ...Object.keys(look.images),
    ...Object.keys(look.imageUrls ?? {}),
  ]);
  if (look.referenceImage || look.referenceImageUrl) keys.add('neutral');
  return keys.size;
}

/** Non-empty attribute chips for a look card, in reading order. */
export function lookAttributeChips(look: Look): { label: string; value: string }[] {
  const a = look.attributes ?? {};
  const chips: { label: string; value: string }[] = [];
  if (a.hair) chips.push({ label: '髪', value: a.hair });
  if (a.outfit) chips.push({ label: '服', value: a.outfit });
  if (a.age) chips.push({ label: '年齢', value: a.age });
  if (a.species) chips.push({ label: '種族', value: a.species });
  if (a.vibe) chips.push({ label: '雰囲気', value: a.vibe });
  if (a.extra) chips.push({ label: 'メモ', value: a.extra });
  return chips;
}

/** "2026年11月17日" style date for a look card. */
export function formatLookDate(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Looks sorted newest-first for the timeline. */
export function sortLooksNewestFirst(looks: Look[]): Look[] {
  return [...looks].sort((a, b) => b.createdAt - a.createdAt);
}
