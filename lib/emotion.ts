import type { ChoiceArchetype, Emotion } from './types';

/**
 * Expression set (改善2).
 *
 * A look used to ship with only `neutral`, so every emotion the chat
 * returned still rendered the same face. The core set below is generated
 * for every confirmed look (at birth and after an appearance change) as
 * identity-preserving edits of that look's neutral reference. The other
 * emotions keep falling back to neutral until they are generated.
 */
export const CORE_EXPRESSION_EMOTIONS: Emotion[] = ['happy', 'blush', 'tsun'];

/** All emotions a fully-generated look carries, including the reference. */
export const FULL_LOOK_EMOTIONS: Emotion[] = ['neutral', ...CORE_EXPRESSION_EMOTIONS];

/** Edit instruction that changes the face and nothing else. */
export const EXPRESSION_ONLY_INSTRUCTION =
  'keep the exact same outfit, hairstyle, hair color and background, change only her facial expression';

/** Pick just the core expression images out of a generate-look response. */
export function pickExpressionImages(
  images: Partial<Record<Emotion, string>>
): Partial<Record<Emotion, string>> {
  const picked: Partial<Record<Emotion, string>> = {};
  for (const emotion of CORE_EXPRESSION_EMOTIONS) {
    const img = images[emotion];
    if (img) picked[emotion] = img;
  }
  return picked;
}

/** Core expressions not yet present in a look's images or stored URLs. */
export function missingCoreExpressions(
  images: Partial<Record<Emotion, string>>,
  imageUrls?: Partial<Record<Emotion, string>>
): Emotion[] {
  return CORE_EXPRESSION_EMOTIONS.filter(
    (emotion) => !images[emotion] && !imageUrls?.[emotion]
  );
}

export function deriveCharacterEmotion(
  affinity: number,
  lastChoice?: ChoiceArchetype,
  isInterrupting?: boolean
): Emotion {
  if (isInterrupting) return 'angry';
  if (lastChoice === 'fujori') return 'surprised';
  if (lastChoice === 'boke' && affinity >= 50) return 'laugh';
  if (affinity <= 30) return 'tsun';
  if (affinity >= 71 && lastChoice === 'tsukkomi') return 'blush';
  if (affinity >= 71) return 'happy';
  return 'neutral';
}
