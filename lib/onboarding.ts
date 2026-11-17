import type { Character, CharacterProfile } from './types';

/**
 * Onboarding = the formless intro. The heroine has no body yet; over a handful
 * of rallies she hears the player's preferences, then we generate her first
 * look. ~10 rallies is the design target; the LLM may also decide it has enough
 * earlier and set onboarding.complete itself.
 */
export const ONBOARDING_TARGET_RALLIES = 10;
/** Hard cap: force completion at this many rallies even if the model didn't. */
export const ONBOARDING_MAX_RALLIES = 12;

/** Topics the onboarding hearing should try to cover, in rough order. */
export const ONBOARDING_TOPICS: { key: keyof CharacterProfile; label: string }[] = [
  { key: 'appearanceNotes', label: '顔立ち・全体の雰囲気' },
  { key: 'hairStyle', label: '髪型・髪色' },
  { key: 'outfit', label: '服装の好み' },
  { key: 'personalityNotes', label: '性格・話し方' },
  { key: 'vibe', label: '一緒に過ごしたい雰囲気' },
  { key: 'nickname', label: '呼び名' },
];

/** A character is "formless" until it has a confirmed current look. */
export function isFormless(character: Pick<Character, 'currentLookId' | 'looks'>): boolean {
  return !character.currentLookId || !(character.looks && character.looks.length > 0);
}

/**
 * Should onboarding end now? True when the model flagged completion, OR we hit
 * the hard cap. (Soft target is advisory and passed to the model in the prompt.)
 */
export function shouldCompleteOnboarding(
  onboardingTurn: number,
  modelSaysComplete: boolean
): boolean {
  return modelSaysComplete || onboardingTurn >= ONBOARDING_MAX_RALLIES;
}

export interface OnboardingStageResolution {
  /** Birth should happen now. */
  complete: boolean;
  /** This turn is the one in-character confirmation rally. */
  confirming: boolean;
}

/**
 * Two-step completion (改善1作り直し / 没入の核).
 *
 * The birth must stay inside the conversation: no forms, no candidate
 * grids. Before she is born, the heroine herself says back what she heard
 * ("わたしって…こういう感じで合ってる？") in exactly ONE confirmation
 * rally. Whatever the player answers — yes, a correction, anything — the
 * next step is the birth: the confirmation never loops (しつこくしない).
 *
 * - wasConfirming: the previous turn was the confirmation rally, so the
 *   player's message is the answer -> complete now (model flag irrelevant).
 * - model wants to complete and we are below the hard cap -> convert this
 *   turn into the confirmation rally instead (unless already confirming).
 * - hard cap -> complete immediately, no extra rally.
 */
export function resolveOnboardingStage(input: {
  /** Rally count including the current turn. */
  onboardingTurn: number;
  modelSaysComplete: boolean;
  modelSaysConfirming: boolean;
  wasConfirming: boolean;
}): OnboardingStageResolution {
  if (input.wasConfirming) {
    return { complete: true, confirming: false };
  }
  const wantsComplete = shouldCompleteOnboarding(
    input.onboardingTurn,
    input.modelSaysComplete
  );
  if (!wantsComplete) {
    return { complete: false, confirming: input.modelSaysConfirming };
  }
  if (input.onboardingTurn >= ONBOARDING_MAX_RALLIES) {
    return { complete: true, confirming: false };
  }
  // Model (or soft completion) wants to finish: spend this turn on the
  // single in-character confirmation instead of being born immediately.
  return { complete: false, confirming: true };
}
