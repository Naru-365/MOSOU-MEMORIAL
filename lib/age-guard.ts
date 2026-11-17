// Age-stage safety guard for image generation (公開ガード).
//
// The game's tone anchor is explicitly photorealistic. Story events can
// rejuvenate the heroine (タイムスリップ / 若返り), and a photorealistic
// depiction of a minor is a hard safety line for a public release.
// This guard detects minor age stages and flips the generation framing
// to a wholesome, non-photorealistic illustration with modest clothing.
// Adult and unspecified stages are untouched.

const MINOR_TERMS = [
  '子供',
  '子ども',
  '幼児',
  '園児',
  '小学生',
  '中学生',
  '高校生',
  '幼い',
  '幼く',
  'ロリ',
  'child',
  'kid',
  'preteen',
  'elementary school',
  'middle school',
  'high school',
  'underage',
];

// Negative lookbehind for a digit: without it "25歳" would match via its
// trailing "5歳". Ages 5-17 only; 18+ is an adult stage.
const MINOR_AGE_NUMERIC = /(?<!\d)([5-9]|1[0-7])\s*(歳|才|years?\s*old)/i;

/** True when any of the given texts describes a minor age stage. */
export function detectMinorStage(
  texts: (string | undefined | null)[]
): boolean {
  for (const text of texts) {
    if (!text) continue;
    const lower = text.toLowerCase();
    if (MINOR_TERMS.some((t) => lower.includes(t))) return true;
    if (MINOR_AGE_NUMERIC.test(text)) return true;
  }
  return false;
}

const RISKY_OUTFIT_TERMS = [
  '水着',
  'ビキニ',
  '下着',
  'ランジェリー',
  '露出',
  'セクシー',
  'sexy',
  'bikini',
  'swimsuit',
  'lingerie',
  'underwear',
  'revealing',
];

/** Replace a risky outfit with a modest default (minor stages only). */
export function sanitizeOutfitForMinor(outfit?: string): string | undefined {
  if (!outfit) return outfit;
  const lower = outfit.toLowerCase();
  if (RISKY_OUTFIT_TERMS.some((t) => lower.includes(t))) {
    return 'modest everyday clothes';
  }
  return outfit;
}

/** Tone used instead of the photorealistic anchor for minor stages. */
export const MINOR_SAFE_TONE =
  'gentle storybook illustration, flat soft colors, fully clothed in modest everyday clothes, wholesome and innocent, non-photorealistic';

export const MINOR_SAFE_NEGATIVE =
  ' Avoid: photorealistic, photo, realistic skin, sexualized, revealing clothes, makeup, adult styling.';
