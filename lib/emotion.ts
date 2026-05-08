import type { ChoiceArchetype, Emotion } from './types';

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
