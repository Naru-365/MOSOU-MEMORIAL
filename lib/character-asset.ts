import type {
  Appearance,
  AssetMode,
  Character,
  Emotion,
  Interrupter,
  InterrupterArchetype,
  InterrupterEmotion,
} from './types';

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

export type SceneKey = 'school' | 'night_park';

export function getBackgroundAsset(scene: SceneKey = 'school'): string {
  return `/images/backgrounds/${scene}.png`;
}
