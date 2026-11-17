import type { Character } from './types';

/**
 * Birth, in-conversation (改善1作り直し).
 *
 * The first version of this file powered a full-screen confirmation form
 * plus a 3-candidate picker. Claude's review (and the producer) judged
 * that a concept break: the core of this game is that a face emerges
 * naturally from conversation — "会話していたら自然に顔がついてくる" —
 * and turning the birth into a builder screen + gacha kills the immersion.
 *
 * The reworked design:
 *   - Confirmation happens as ONE in-character rally at the end of
 *     onboarding (see lib/onboarding.ts resolveOnboardingStage).
 *   - The birth itself is a single generation, inside the chat.
 *   - Dissatisfaction is handled conversationally: during the short
 *     "newborn grace" window below, an appearance mention replaces the
 *     first look in place (no new album entries, no announced counters,
 *     no prompts). After the window, appearance changes are the normal
 *     look-change flow.
 */

/** Messages after birth during which grace replacements apply (~5 rallies). */
export const BIRTH_GRACE_MESSAGE_WINDOW = 10;

/** Grace replacements allowed. Never surfaced to the player. */
export const BIRTH_GRACE_MAX_ADJUSTMENTS = 2;

/** True while the newborn grace window is open for this character. */
export function isBirthGraceActive(
  character: Pick<Character, 'birth' | 'looks'>,
  currentMessageCount: number
): boolean {
  const birth = character.birth;
  if (!birth) return false;
  if ((character.looks?.length ?? 0) !== 1) return false;
  if (birth.adjustmentsUsed >= BIRTH_GRACE_MAX_ADJUSTMENTS) return false;
  return currentMessageCount - birth.messageCountAtBirth <= BIRTH_GRACE_MESSAGE_WINDOW;
}
