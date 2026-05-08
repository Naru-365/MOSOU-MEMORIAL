import type { Choice, Interrupter, Personality } from './types';
import type { SlotDictionary } from './template-engine';

export const defaultSlotDictionary: SlotDictionary = {
  topic: [
    'カフェ',
    'コンビニの新作',
    '推しの話',
    '昨日のドラマ',
    '次の連休',
    'バイト先のうわさ',
    '飼い猫',
    '昼ごはん',
    'おすすめのアプリ',
  ],
};

const seedTime = 0; // deterministic seed time for default entities

export const defaultInterrupters: Interrupter[] = [
  {
    id: 'default-tsukkomi',
    name: 'ツッコミ部長',
    archetype: 'tsukkomi',
    description: '会話の論理破綻を見逃さない',
    messageTemplates: [
      'おいおい、{topic}の話で何盛り上がってんの？',
      'いやその返し、論理的に破綻してるって',
      '待って待って、今の{char}のセリフ、伏線回収できてないよ',
      'カットカット！もう一回テイク撮るぞ',
    ],
    trigger: {
      everyNTurns: 5,
      keywordTriggers: ['好き', '付き合', 'デート'],
      baseProbability: 0.18,
    },
    modifiedChoices: [
      { label: '謝る (-5)', value: 'positive', archetype: 'boke', affinityChange: -5 },
      { label: '無視する (-10)', value: 'neutral', archetype: 'tsukkomi', affinityChange: -10 },
      { label: '言い返す (+5)', value: 'negative', archetype: 'fujori', affinityChange: 5 },
    ],
    enabled: true,
    createdAt: seedTime,
    updatedAt: seedTime,
  },
  {
    id: 'default-yandere',
    name: '束縛系・夜々子',
    archetype: 'yandere',
    description: '嫉妬で乱入してくる',
    messageTemplates: [
      '…ねえ、誰と{topic}の話してるの？',
      '私の方を見てって言ったよね？',
      'バレないと思った？全部聞こえてたよ',
      'もう{char}のこと忘れてくれる？',
    ],
    trigger: {
      minJealousy: 50,
      baseProbability: 0.25,
    },
    modifiedChoices: [
      { label: '従う (-15)', value: 'positive', archetype: 'boke', affinityChange: -15 },
      { label: 'なだめる (±0)', value: 'neutral', archetype: 'tsukkomi', affinityChange: 0 },
      { label: '突っぱねる (+10)', value: 'negative', archetype: 'fujori', affinityChange: 10 },
    ],
    enabled: true,
    createdAt: seedTime,
    updatedAt: seedTime,
  },
  {
    id: 'default-meta',
    name: 'メタくん',
    archetype: 'meta',
    description: 'ゲーム自体に言及してくる',
    messageTemplates: [
      'あれ、これゲームだよね？{user}さん',
      'その選択肢、本当に選んでいいの？',
      '今のセーブした？してないよね',
      'ところでこのアプリ、まだβ版って書いてあるよ',
    ],
    trigger: {
      everyNTurns: 7,
      baseProbability: 0.1,
    },
    modifiedChoices: [
      { label: '…え？ (??)', value: 'positive', archetype: 'fujori', affinityChange: 0 },
      { label: '無視する (±0)', value: 'neutral', archetype: 'tsukkomi', affinityChange: 0 },
      { label: 'ゲームを閉じる (GAME OVER?)', value: 'negative', archetype: 'fujori', affinityChange: -50 },
    ],
    enabled: true,
    createdAt: seedTime,
    updatedAt: seedTime,
  },
];

// Standard (non-interrupted) choices: comedy frame
export const standardChoices: Choice[] = [
  { label: 'ボケる (+5)', value: 'positive', archetype: 'boke', affinityChange: 5 },
  { label: 'ツッコむ (+10)', value: 'positive', archetype: 'tsukkomi', affinityChange: 10 },
  { label: '不条理に返す (-5)', value: 'negative', archetype: 'fujori', affinityChange: -5 },
];

export const characterResponseTemplates: Record<'low' | 'mid' | 'high', string[]> = {
  low: [
    '…別に話すことないけど',
    '何か用？',
    'ふーん…で？',
    'あっそ。{topic}の話でも勝手にしてれば？',
  ],
  mid: [
    'うん、{topic}の話？',
    'なに～？',
    'へぇ、そうなんだ',
    'ふふ、面白いね',
  ],
  high: [
    '{user}くんと話すの、ちょっと嬉しいかも',
    'えへへ、もっと話そうよ',
    'ねぇ、今度{topic}とか行こっか？',
    'ずっとこうしていたいな…って言うと思った？',
  ],
};

export const personalityModifiers: Record<Personality, string[]> = {
  '優しい': ['…なんてね', 'えへへ', '♪', '…かな？'],
  'クール': ['…', 'べつに', 'ふーん', 'そう'],
  'ツンデレ': ['べ、別に…', '勘違いしないでよね', 'バカ', 'し、仕方ないわね'],
};
