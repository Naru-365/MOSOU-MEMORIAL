import type { Character, Choice, InterrupterType } from './types';

// Response rules based on affinity level
const responseRules = {
  low: {
    range: [0, 30] as [number, number],
    responses: [
      '…別に話すことないけど',
      '何か用？',
      'ふーん…',
      'あっそ',
      '…で？',
    ],
  },
  mid: {
    range: [31, 70] as [number, number],
    responses: [
      'うん、どうしたの？',
      'なに～？',
      'へぇ、そうなんだ',
      'うんうん、それで？',
      'ふふ、面白いね',
    ],
  },
  high: {
    range: [71, 100] as [number, number],
    responses: [
      '〇〇くんと話すの、ちょっと嬉しいかも',
      'えへへ、もっと話そうよ',
      'ねぇ、今度どこか行こっか？',
      '〇〇くんといると楽しいな',
      'ずっとこうしていたいな…',
    ],
  },
};

// Personality-based response modifiers
const personalityModifiers: Record<string, string[]> = {
  '優しい': ['…なんてね', 'えへへ', '♪', '…かな？'],
  'クール': ['…', 'べつに', 'ふーん', 'そう'],
  'ツンデレ': ['べ、別に…', '勘違いしないでよね', 'バカ', 'し、仕方ないわね'],
};

// Standard choices
export const standardChoices: Choice[] = [
  { label: '優しく話す (+10)', value: 'positive', affinityChange: 10 },
  { label: '普通に返す (±0)', value: 'neutral', affinityChange: 0 },
  { label: 'そっけなく返す (-10)', value: 'negative', affinityChange: -10 },
];

// Interrupter messages by type
const interrupterMessages: Record<InterrupterType, string[]> = {
  'ツッコミ系': [
    'おいおい、何やってんの？',
    'それ、論理的におかしくない？',
    '待って、今の会話破綻してるよ',
    'ちょっと、話の流れおかしいでしょ',
  ],
  '束縛系': [
    '誰と話してるの…？',
    'どこ行くの？報告して',
    '他の人と仲良くしないで',
    '私だけを見てて…',
  ],
  'メタ系': [
    'あれ、これゲームだよね？',
    'その選択肢、本当に選んでいいの？',
    'プレイヤーさん、ちょっと待って',
    '今のセーブした？してないよね？',
  ],
};

// Modified choices when interrupter appears
const modifiedChoices: Record<InterrupterType, Choice[]> = {
  'ツッコミ系': [
    { label: '謝る (-5)', value: 'positive', affinityChange: -5 },
    { label: '無視する (-10)', value: 'neutral', affinityChange: -10 },
    { label: '言い返す (+5)', value: 'negative', affinityChange: 5 },
  ],
  '束縛系': [
    { label: '従う (-15)', value: 'positive', affinityChange: -15 },
    { label: 'なだめる (±0)', value: 'neutral', affinityChange: 0 },
    { label: '突っぱねる (+10)', value: 'negative', affinityChange: 10 },
  ],
  'メタ系': [
    { label: '…え？ (??)', value: 'positive', affinityChange: Math.random() > 0.5 ? 20 : -20 },
    { label: '無視する (±0)', value: 'neutral', affinityChange: 0 },
    { label: 'ゲームを閉じる (GAME OVER?)', value: 'negative', affinityChange: -50 },
  ],
};

export function getCharacterResponse(affinity: number, character: Character): string {
  let responsePool: string[];

  if (affinity <= responseRules.low.range[1]) {
    responsePool = responseRules.low.responses;
  } else if (affinity <= responseRules.mid.range[1]) {
    responsePool = responseRules.mid.responses;
  } else {
    responsePool = responseRules.high.responses;
  }

  const baseResponse = responsePool[Math.floor(Math.random() * responsePool.length)];
  const modifiers = personalityModifiers[character.personality] || [];
  
  // 30% chance to add personality modifier
  if (modifiers.length > 0 && Math.random() < 0.3) {
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    return `${baseResponse}${modifier}`;
  }

  return baseResponse;
}

export function shouldTriggerInterruption(jealousy: number): boolean {
  // Base probability of 20%, increases with jealousy
  const baseProbability = 0.2;
  const jealousyBonus = jealousy >= 50 ? (jealousy - 50) / 100 : 0;
  return Math.random() < (baseProbability + jealousyBonus);
}

export function getRandomInterrupterType(): InterrupterType {
  const types: InterrupterType[] = ['ツッコミ系', '束縛系', 'メタ系'];
  return types[Math.floor(Math.random() * types.length)];
}

export function getInterrupterMessage(type: InterrupterType): string {
  const messages = interrupterMessages[type];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getModifiedChoices(type: InterrupterType): Choice[] {
  return modifiedChoices[type];
}

export function calculateJealousyIncrease(choice: 'positive' | 'neutral' | 'negative'): number {
  switch (choice) {
    case 'positive':
      return 5; // Being nice to character increases jealousy
    case 'neutral':
      return 2;
    case 'negative':
      return -3; // Being cold decreases jealousy
    default:
      return 0;
  }
}
