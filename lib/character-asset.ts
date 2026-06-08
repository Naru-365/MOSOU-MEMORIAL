import type {
  Appearance,
  AssetMode,
  Character,
  Emotion,
  Interrupter,
  InterrupterArchetype,
  InterrupterEmotion,
  Look,
  SceneKey,
} from './types';

export type { SceneKey };

const appearanceSlugMap: Record<Appearance, string> = {
  '清楚系': 'seiso',
  'ギャル系': 'gal',
  'ナチュラル': 'natural',
};

const interrupterSlugMap: Record<InterrupterArchetype, string> = {
  tsukkomi: 'tsukkomi',
  yandere: 'yandere',
  meta: 'meta',
  custom: 'custom',
};

const extFor = (mode: AssetMode): string =>
  mode === 'video' ? 'mp4' : mode === '3d' ? 'glb' : 'png';

export interface AssetRef {
  mode: AssetMode;
  src: string;
  fallback: string;
}

/**
 * Legacy resolver: maps a static appearance slug to a public image path.
 * Kept for backward compatibility (form-created characters with no Look) and as
 * the path fallback inside resolveCharacterAsset.
 */
export function getCharacterAsset(
  character: Pick<Character, 'appearance'>,
  emotion: Emotion = 'neutral',
  mode: AssetMode = 'image'
): AssetRef {
  const slug = appearanceSlugMap[character.appearance] ?? 'seiso';
  const ext = extFor(mode);
  return {
    mode,
    src: `/images/characters/${slug}/${emotion}.${ext}`,
    fallback: `/images/characters/${slug}/neutral.${ext}`,
  };
}

/**
 * Resolved render target for the conversational-open-world concept.
 *
 * Priority:
 *  1. `generatedSrc` — a data URL from the active Look (gpt-image-2 output).
 *     Falls back within the look to neutral / referenceImage.
 *  2. `pathSrc` — legacy public path to try (may 404 -> caller shows silhouette).
 *  3. neither -> formless: caller renders the silhouette / name-initial fallback.
 */
export interface ResolvedAsset {
  mode: AssetMode;
  emotion: Emotion;
  /** Generated data URL (guaranteed to exist when non-null). */
  generatedSrc: string | null;
  /** Public path to attempt when no generated image is available. */
  pathSrc: string | null;
  /** True when no image source is available at all (formless). */
  formless: boolean;
}

export function resolveCharacterAsset(
  character: Pick<Character, 'appearance' | 'looks' | 'currentLookId'>,
  look: Look | null | undefined,
  emotion: Emotion = 'neutral',
  mode: AssetMode = 'image'
): ResolvedAsset {
  // 1. Generated image from the active look. Runtime base64 first (freshest),
  //    then persisted Supabase Storage URLs (survive reload / cross-device).
  if (look) {
    const generated =
      look.images[emotion] ??
      look.images.neutral ??
      look.imageUrls?.[emotion] ??
      look.imageUrls?.neutral ??
      look.referenceImage ??
      look.referenceImageUrl ??
      null;
    if (generated) {
      return { mode, emotion, generatedSrc: generated, pathSrc: null, formless: false };
    }
    // Look exists but has no image source (e.g. generation failed and nothing
    // was uploaded). Not a legacy static character -> treat as formless so the
    // UI prompts a regenerate instead of loading a wrong slug.
    return { mode, emotion, generatedSrc: null, pathSrc: null, formless: true };
  }

  // 2. No look at all. If this is a legacy form-created character, try the
  //    static public path; the component falls back to the initial on error.
  const hasLooks = (character.looks?.length ?? 0) > 0 || !!character.currentLookId;
  if (!hasLooks) {
    const { src } = getCharacterAsset(character, emotion, mode);
    return { mode, emotion, generatedSrc: null, pathSrc: src, formless: false };
  }

  // 3. Truly formless.
  return { mode, emotion, generatedSrc: null, pathSrc: null, formless: true };
}

export function getInterrupterAsset(
  interrupter: Pick<Interrupter, 'archetype'>,
  emotion: InterrupterEmotion = 'intro',
  mode: AssetMode = 'image'
): AssetRef {
  const slug = interrupterSlugMap[interrupter.archetype] ?? 'custom';
  const ext = extFor(mode);
  return {
    mode,
    src: `/images/interrupters/${slug}/${emotion}.${ext}`,
    fallback: `/images/interrupters/${slug}/intro.${ext}`,
  };
}

export function getBackgroundAsset(scene: SceneKey = 'school'): string {
  return `/images/backgrounds/${scene}.png`;
}
