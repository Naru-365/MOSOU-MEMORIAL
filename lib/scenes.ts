// --- Scene-change detection from free chat ------------------------------------
// Mirrors lib/looks.ts: lightweight, deterministic keyword triggers so a chat
// scene/background change can fire without an extra LLM call. When the player
// brings up a place or an event ("海に行きたい", "お祭り行こう"), we generate a
// matching empty background via /api/generate-background.

export interface SceneChangeIntent {
  /** Human label for the scene, e.g. "海". */
  label: string;
  /** English location/scene description handed to gpt-image-2 (no people). */
  sceneDescription: string;
}

interface SceneTrigger {
  keywords: string[];
  build: () => SceneChangeIntent;
}

const SCENE_TRIGGERS: SceneTrigger[] = [
  {
    keywords: ['海', '海辺', 'ビーチ', '浜辺', '砂浜'],
    build: () => ({
      label: '海',
      sceneDescription: 'a sunny Japanese beach by the sea, blue sky and calm waves',
    }),
  },
  {
    keywords: ['学校', '教室', '校舎', '放課後'],
    build: () => ({
      label: '学校',
      sceneDescription: 'a quiet Japanese high school classroom in the afternoon',
    }),
  },
  {
    keywords: ['カフェ', '喫茶', 'コーヒー', '珈琲'],
    build: () => ({
      label: 'カフェ',
      sceneDescription: 'a cozy modern Japanese cafe interior with warm light',
    }),
  },
  {
    keywords: ['公園', '広場', 'ベンチ'],
    build: () => ({
      label: '公園',
      sceneDescription: 'a peaceful Japanese park with greenery and a path',
    }),
  },
  {
    keywords: ['祭り', 'お祭り', '花火', '屋台', '縁日'],
    build: () => ({
      label: 'お祭り',
      sceneDescription: 'a Japanese summer festival at night, paper lanterns and food stalls, fireworks in the sky',
    }),
  },
  {
    keywords: ['遊園地', 'テーマパーク', '観覧車', 'ジェットコースター'],
    build: () => ({
      label: '遊園地',
      sceneDescription: 'a colorful amusement park with a ferris wheel under a bright sky',
    }),
  },
  {
    keywords: ['温泉', '旅館', '露天'],
    build: () => ({
      label: '温泉',
      sceneDescription: 'a traditional Japanese hot spring (onsen) town, steam and wooden buildings at dusk',
    }),
  },
  {
    keywords: ['旅行', '旅', '観光'],
    build: () => ({
      label: '旅行',
      sceneDescription: 'a scenic Japanese travel destination, mountains and a clear sky',
    }),
  },
  {
    keywords: ['デート', 'お出かけ', '出かけ'],
    build: () => ({
      label: 'お出かけ',
      sceneDescription: 'a lively Japanese shopping street in the evening, soft city lights',
    }),
  },
  {
    keywords: ['駅', '街', '繁華街'],
    build: () => ({
      label: '街',
      sceneDescription: 'a busy Japanese city street near a train station, urban scenery',
    }),
  },
  {
    keywords: ['部屋', '自宅', '家', 'おうち', 'リビング'],
    build: () => ({
      label: '部屋',
      sceneDescription: 'a tidy cozy Japanese apartment room interior, soft daylight',
    }),
  },
  {
    keywords: ['レストラン', '食事', 'ディナー', 'ご飯'],
    build: () => ({
      label: 'レストラン',
      sceneDescription: 'an elegant Japanese restaurant interior with warm ambient lighting',
    }),
  },
  {
    keywords: ['映画', '映画館', 'シアター'],
    build: () => ({
      label: '映画館',
      sceneDescription: 'a dim movie theater interior with rows of empty seats and a glowing screen',
    }),
  },
];

/** Returns a scene-change intent if the text matches a trigger, else null. */
export function detectSceneChange(text: string): SceneChangeIntent | null {
  for (const t of SCENE_TRIGGERS) {
    if (t.keywords.some((k) => text.includes(k))) return t.build();
  }
  return null;
}
