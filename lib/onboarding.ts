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
