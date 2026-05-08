import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { selectInterrupter } from '@/lib/chat-logic';
import type {
  ChatApiError,
  ChatApiRequest,
  ChatApiResponse,
} from '@/lib/api-types';
import type {
  Character,
  Emotion,
  Interrupter,
  InterrupterEmotion,
  Message,
} from '@/lib/types';

export const runtime = 'nodejs';

const HEROINE_EMOTIONS: Emotion[] = [
  'neutral',
  'happy',
  'tsun',
  'blush',
  'angry',
  'surprised',
  'laugh',
  'sad',
];

const INTERRUPTER_EMOTIONS: InterrupterEmotion[] = [
  'intro',
  'peeved',
  'smug',
];

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function buildHeroineSystemPrompt(
  character: Character,
  affinity: number,
  jealousy: number,
  userName: string,
  turnCount: number
): string {
  return [
    `あなたは恋愛シミュレーションゲーム「妄想メモリアル」のヒロインを演じます。`,
    ``,
    `# あなたのプロフィール`,
    `- 名前: ${character.name}`,
    `- 性格: ${character.personality}`,
    `- 見た目: ${character.appearance}`,
    ``,
    `# プレイヤー情報`,
    `- プレイヤー名: ${userName}`,
    `- 現在の好感度（あなたから見たプレイヤーへの好意）: ${affinity}/100`,
    `- 嫉妬度（周囲のライバルキャラの嫉妬）: ${jealousy}/100`,
    `- 会話ターン数: ${turnCount}`,
    ``,
    `# キャラ性格の演じ分け`,
    `- 「優しい」: 柔らかく肯定的、語尾「〜だね」「〜かな？」、たまに「えへへ」`,
    `- 「クール」: 短文、語尾「ふーん」「べつに」、感情を出さない`,
    `- 「ツンデレ」: 「べ、別に…」「勘違いしないでよね」「バカ」、内心は好意`,
    ``,
    `# 好感度に応じた態度`,
    `- 0-30 (低): 素っ気ない、距離感あり、興味なさそう`,
    `- 31-70 (中): 普通に応対、少し興味を持つ`,
    `- 71-100 (高): 親しい、好意を匂わせる（ただし直球は避ける）`,
    ``,
    `# 全体トーン`,
    `- 大衆向けでギャグ要素強め、過度に恋愛色を出さない`,
    `- セクシャル/アダルト/暴力的な内容は厳禁`,
    `- 1〜3文で短めに返す（モバイルチャット想定）`,
    `- 日本語で`,
    ``,
    `# 出力（必ずJSON形式）`,
    `- reply: あなたのセリフ（性格・好感度に沿って）`,
    `- affinityChange: ユーザーの今回のメッセージで好感度がいくつ動くか。-15 から +15 の整数。`,
    `  - 失礼/不快/暴力的なら -10 〜 -15`,
    `  - つまらない/無関係なら -5 〜 0`,
    `  - 普通の会話なら 0 〜 +3`,
    `  - 優しい/面白い/気が利く発言なら +5 〜 +10`,
    `  - とても感動的/響いた発言なら +12 〜 +15`,
    `- jealousyChange: 嫉妬度の変化。-10 〜 +10 の整数。プレイヤーがあなたに親密に振る舞うほど周囲のライバルが嫉妬して上がる。`,
    `- emotion: あなたの今の表情。次のいずれか: neutral, happy, tsun, blush, angry, surprised, laugh, sad`,
  ].join('\n');
}

function buildInterrupterSystemPrompt(
  interrupter: Interrupter,
  character: Character,
  affinity: number,
  jealousy: number,
  userName: string
): string {
  const archetypeGuide: Record<string, string> = {
    tsukkomi: '会話の論理破綻を指摘してツッコむ。「いやそれおかしいでしょ」「待って待って」系。',
    yandere: '嫉妬深く、プレイヤーがヒロインと仲良くするのを許さない。「私の方を見て」「他の子と話さないで」系。',
    meta: 'ゲーム自体に言及して第四の壁を破る。「これゲームだよね？」「セーブした？」系。',
    custom: '自分のアイデンティティに沿って乱入する。',
  };

  return [
    `あなたは恋愛シミュレーションゲーム「妄想メモリアル」に乱入する邪魔者キャラクターを演じます。`,
    ``,
    `# あなたのプロフィール`,
    `- 名前: ${interrupter.name}`,
    `- タイプ: ${interrupter.archetype}`,
    `- 説明: ${interrupter.description ?? '(設定なし)'}`,
    `- 役割: ${archetypeGuide[interrupter.archetype] ?? archetypeGuide.custom}`,
    ``,
    `# 状況`,
    `- ヒロイン名: ${character.name}（性格: ${character.personality}）`,
    `- プレイヤー名: ${userName}`,
    `- ヒロインの好感度: ${affinity}/100`,
    `- 嫉妬度: ${jealousy}/100`,
    `- あなたは「乱入してきた」立場。長居せず1〜2文でガツンと切り込む`,
    ``,
    `# あなたの過去のセリフ例（あなたらしさの参考）`,
    interrupter.messageTemplates.slice(0, 4).map((t) => `- ${t}`).join('\n'),
    ``,
    `# トーン`,
    `- ギャグ寄り、コメディ調`,
    `- セクシャル/アダルト/暴力的な内容は厳禁`,
    `- 1〜2文で短く、インパクト重視`,
    `- 日本語で`,
    ``,
    `# 出力（必ずJSON形式）`,
    `- reply: 邪魔者のセリフ`,
    `- affinityChange: ユーザーの発言を受けてヒロインの好感度がいくつ動くか。-10 〜 +5 の整数（邪魔者の存在で通常はマイナス寄り）`,
    `- jealousyChange: 嫉妬度の変化。-5 〜 +10 の整数（あなたの登場で上がりやすい）`,
    `- emotion: あなたの今の様子。次のいずれか: intro, peeved, smug`,
    `  - intro: 乱入直後、勢いよく登場`,
    `  - peeved: イラつき、嘆息`,
    `  - smug: ニヤリ、満足げ`,
  ].join('\n');
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: 'キャラクターのセリフ。1〜3文の日本語。',
    },
    affinityChange: {
      type: Type.NUMBER,
      description: '好感度の変化（整数、-15〜+15）',
    },
    jealousyChange: {
      type: Type.NUMBER,
      description: '嫉妬度の変化（整数、-15〜+15）',
    },
    emotion: {
      type: Type.STRING,
      description:
        'ヒロインなら: neutral|happy|tsun|blush|angry|surprised|laugh|sad、邪魔者なら: intro|peeved|smug',
    },
  },
  required: ['reply', 'affinityChange', 'jealousyChange', 'emotion'],
  propertyOrdering: ['reply', 'affinityChange', 'jealousyChange', 'emotion'],
};

function messagesToContents(history: Message[], userMessage: string) {
  const contents = history
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }));
  contents.push({ role: 'user', parts: [{ text: userMessage }] });
  return contents;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ChatApiError>(
      { error: 'GEMINI_API_KEY not configured', code: 'NO_API_KEY' },
      { status: 500 }
    );
  }

  let body: ChatApiRequest;
  try {
    body = (await req.json()) as ChatApiRequest;
  } catch {
    return NextResponse.json<ChatApiError>(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const {
    character,
    interrupters,
    gameState,
    userMessage,
    userName,
    history,
  } = body;

  if (!character || !userMessage?.trim()) {
    return NextResponse.json<ChatApiError>(
      { error: 'character and userMessage are required', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  // Project state: increment turnCount as if this turn already happened, since
  // the trigger logic considers the post-turn state.
  const projectedState = { ...gameState, turnCount: gameState.turnCount + 1 };
  const interrupter = selectInterrupter(interrupters, projectedState, {
    recentText: userMessage,
  });

  const systemInstruction = interrupter
    ? buildInterrupterSystemPrompt(
        interrupter,
        character,
        gameState.affinity,
        gameState.jealousy,
        userName
      )
    : buildHeroineSystemPrompt(
        character,
        gameState.affinity,
        gameState.jealousy,
        userName,
        gameState.turnCount
      );

  const trimmedHistory = history.slice(-10);
  const contents = messagesToContents(trimmedHistory, userMessage);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.9,
      },
    });

    const text = result.text;
    if (!text) {
      return NextResponse.json<ChatApiError>(
        { error: 'Empty response from Gemini', code: 'GEMINI_FAILED' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text) as {
      reply: string;
      affinityChange: number;
      jealousyChange: number;
      emotion: string;
    };

    const speaker: 'character' | 'interrupter' = interrupter
      ? 'interrupter'
      : 'character';

    const validEmotions: string[] = interrupter
      ? INTERRUPTER_EMOTIONS
      : HEROINE_EMOTIONS;
    const emotion = (
      validEmotions.includes(parsed.emotion)
        ? parsed.emotion
        : interrupter
        ? 'intro'
        : 'neutral'
    ) as Emotion | InterrupterEmotion;

    const response: ChatApiResponse = {
      speaker,
      interrupterId: interrupter?.id,
      reply: parsed.reply.trim(),
      affinityChange: clamp(Math.round(parsed.affinityChange ?? 0), -15, 15),
      jealousyChange: clamp(Math.round(parsed.jealousyChange ?? 0), -15, 15),
      emotion,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[api/chat] Gemini call failed:', err);
    return NextResponse.json<ChatApiError>(
      {
        error:
          err instanceof Error ? err.message : 'Unknown error from Gemini',
        code: 'GEMINI_FAILED',
      },
      { status: 502 }
    );
  }
}
