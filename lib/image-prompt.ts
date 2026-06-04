import type { CharacterProfile, Emotion, LookAttributes } from '@/lib/types';

export const EMOTION_SUFFIX: Record<Emotion, string> = {
  neutral: 'calm soft expression, looking at camera, mouth closed',
  happy: 'bright open-mouth smile, eyes squinted in joy',
  tsun: 'slight pout, looking away to the side, mildly annoyed',
  blush: 'shy half-smile, light blush on cheeks, eyes glancing downward',
  angry: 'frowning hard, knit brows, lips pressed thin',
  surprised: 'eyes wide open, mouth slightly agape, eyebrows raised',
  laugh: 'laughing out loud with one hand covering mouth, eyes closed',
  sad: 'downcast eyes, slight frown, shoulders slumped',
};

export const TONE_ANCHOR =
  'photorealistic, 35mm film photo, soft natural daylight, plain light interior background, bust-up portrait, candid amateur photography aesthetic, gentle film grain, Japanese TV drama still style, wholesome, not oversexualized';

const NEGATIVE_GUIDANCE =
  ' Avoid: anime, illustration, 3d render, deformed face, extra fingers, watermark, text.';

export function buildBaseLookPrompt(
  characterName: string,
  profile?: CharacterProfile,
  attributes?: LookAttributes
): string {
  const parts: string[] = [`Photo of a Japanese character named ${characterName}.`];

  if (profile?.appearanceNotes) parts.push(profile.appearanceNotes);
  if (profile?.hairStyle) parts.push(`Hair: ${profile.hairStyle}.`);
  if (profile?.outfit) parts.push(`Outfit: ${profile.outfit}.`);
  if (profile?.vibe) parts.push(`Vibe: ${profile.vibe}.`);
  if (profile?.rawSummary) parts.push(profile.rawSummary);

  if (attributes?.hair) parts.push(`Hair style: ${attributes.hair}.`);
  if (attributes?.outfit) parts.push(`Wearing: ${attributes.outfit}.`);
  if (attributes?.age) parts.push(`Age stage: ${attributes.age}.`);
  if (attributes?.species) parts.push(`Species: ${attributes.species}.`);
  if (attributes?.vibe) parts.push(`Atmosphere: ${attributes.vibe}.`);
  if (attributes?.extra) parts.push(attributes.extra);

  parts.push(TONE_ANCHOR + NEGATIVE_GUIDANCE);

  return parts.join(' ');
}

export function buildLookPromptForEmotion(base: string, emotion: Emotion): string {
  return `${base}, ${EMOTION_SUFFIX[emotion]}`;
}

export function buildEditPrompt(
  base: string,
  changeInstruction: string | undefined,
  emotion: Emotion
): string {
  const changePart = changeInstruction ? ` ${changeInstruction.trim()}.` : '';
  const raw = `same person, keep face and identity identical.${changePart} ${EMOTION_SUFFIX[emotion]}. ${TONE_ANCHOR}`;
  // Collapse doubled punctuation and extra spaces
  return raw.replace(/\.{2,}/g, '.').replace(/\s{2,}/g, ' ').trim();
}
