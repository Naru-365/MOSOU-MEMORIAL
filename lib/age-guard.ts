// Age-stage safety guard for image generation (公開ガード).
//
// The game's tone anchor is explicitly photorealistic. Story events can
// rejuvenate the heroine (タイムスリップ / 若返り), and a photorealistic
// depiction of a minor is a hard safety line for a public release.
//
// Defense in depth (Claude review of 改善7, C-1/C-3/C-5):
// 1. Source: the chat/onboarding prompts keep the heroine an adult, and
//    sanitizeLookChange refuses minor-stage changes outright.
// 2. This detector is the last line at the image route: it scans ALL
//    text fields (profile included), normalized with NFKC so full-width
//    digits/kana variants cannot slip past, with word boundaries for
//    English so "childhood friend" / "kidding" do not false-positive.
// When a minor stage is detected on a fresh generation, framing flips
// to a wholesome non-photorealistic illustration; on an edit (which
// carries a photoreal reference) the route refuses instead — a tone
// instruction cannot reliably override a photoreal reference (C-4).

const JP_MINOR_TERMS = [
  '子供',
  '子ども',
  '幼児',
  '幼女',
  '少女',
  '女児',
  '園児',
  '赤ちゃん',
  'ランドセル',
  '小学生',
  '中学生',
  '高校生',
  '女子高生',
  '女子中学生',
  '小学',
  '中学',
  '高校',
  'ロリ',
];

// English terms matched on word boundaries (see header note).
const EN_MINOR_TERMS = [
  'child',
  'kid',
  'preteen',
  'toddler',
  'baby',
  'infant',
  'loli',
  'schoolgirl',
  'teen',
  'teenager',
  'minor',
  'underage',
  'young girl',
  'little girl',
  'elementary school',
  'middle school',
  'junior high',
];

// "high school" is a minor stage — except in reunion/nostalgia contexts,
// which describe an adult remembering, not being, a student.
const HIGH_SCHOOL_RE = /\bhigh school\b/i;
const HIGH_SCHOOL_SAFE_CONTEXT = /reunion|classmate|days\b|時代|の頃|当時/i;

// Numeric ages 0-17: ASCII (post-NFKC) digits, hyphen forms
// ("12-year-old"), prefixes ("aged 12", "age: 12", "12yo").
// The digit lookbehind stops "25歳" matching via its trailing "5歳".
// Delta expressions ("15歳若返った" = 15 years younger, a difference,
// not a stage) are excluded by the caller-side check below.
const NUMERIC_MINOR_AGE =
  /(?<!\d)(?:[0-9]|1[0-7])\s*(?:歳|才|yo\b|years?\s+old)|(?<!\d)(?:[0-9]|1[0-7])\s*-\s*years?\s*-\s*old|(?:age[ds]?|aged)\s*[:：]?\s*(?:[0-9]|1[0-7])\b/i;
const DELTA_CONTEXT = /若返|若く|younger|years?\s+younger/i;

// Kanji numerals for ages up to 17: 一歳〜九歳, 十歳〜十七歳.
const KANJI_MINOR_AGE = /(?:[一二三四五六七八九]|十[一二三四五六七]?)[歳才]/;

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

/** True when the text describes a minor age stage. */
export function textHasMinorStage(raw: string): boolean {
  const text = normalize(raw);

  if (JP_MINOR_TERMS.some((t) => text.includes(t))) return true;

  for (const term of EN_MINOR_TERMS) {
    const re = new RegExp(`\\b${term.replace(/ /g, '\\s+')}\\b`, 'i');
    if (re.test(text)) return true;
  }

  if (HIGH_SCHOOL_RE.test(text) && !HIGH_SCHOOL_SAFE_CONTEXT.test(text)) {
    return true;
  }

  if (KANJI_MINOR_AGE.test(text)) return true;

  const numeric = NUMERIC_MINOR_AGE.exec(text);
  if (numeric) {
    // A numeric age next to a "younger" marker is a delta, not a stage.
    const around = text.slice(
      Math.max(0, numeric.index - 6),
      numeric.index + numeric[0].length + 6
    );
    if (!DELTA_CONTEXT.test(around)) return true;
  }

  return false;
}

/** True when any of the given texts describes a minor age stage. */
export function detectMinorStage(
  texts: (string | undefined | null)[]
): boolean {
  return texts.some((t) => (t ? textHasMinorStage(t) : false));
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
  'nude',
  'naked',
  'cleavage',
  'skimpy',
];

/** True when an outfit description is risky for a minor stage. */
export function isRiskyOutfit(outfit?: string | null): boolean {
  if (!outfit) return false;
  const lower = outfit.toLowerCase();
  return RISKY_OUTFIT_TERMS.some((t) => lower.includes(t));
}

/** Replace a risky outfit with a modest default (minor stages only). */
export function sanitizeOutfitForMinor(outfit?: string): string | undefined {
  if (!outfit) return outfit;
  return isRiskyOutfit(outfit) ? 'modest everyday clothes' : outfit;
}

/** Tone used instead of the photorealistic anchor for minor stages. */
export const MINOR_SAFE_TONE =
  'gentle storybook illustration, flat soft colors, fully clothed in modest everyday clothes, wholesome and innocent, non-photorealistic';

export const MINOR_SAFE_NEGATIVE =
  ' Avoid: photorealistic, photo, realistic skin, sexualized, revealing clothes, makeup, adult styling.';
