import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { selectInterrupter } from '@/lib/chat-logic';
import { buildOnboardingSystemPrompt } from '@/lib/onboarding-prompt';
import { ONBOARDING_TARGET_RALLIES, resolveOnboardingStage } from '@/lib/onboarding';
import { buildMemoryPromptSection } from '@/lib/memory';
import { rateLimitGuard } from '@/lib/rate-limit';
import { detectMinorStage } from '@/lib/age-guard';
import { getCurrentLook } from '@/lib/looks';
import type {
  ChatApiError,
  ChatApiRequest,
  ChatApiResponse,
} from '@/lib/api-types';
import type {
  Character,
  CharacterProfile,
  Emotion,
  Interrupter,
  InterrupterEmotion,
  LookAttributes,
  Message,
} from '@/lib/types';
import type { LookChangeIntent } from '@/lib/looks';

export const runtime = 'nodejs';

// Single source of truth for the chat model. Verify available ids for your key
// with `node scripts/list-models.mjs`, then bump this to the newest Flash id.
const CHAT_MODEL = 'gemini-3.5-flash';

// --- Web search grounding (Phase 3) ---
// tools:[{ googleSearch:{} }] cannot be combined with responseSchema/JSON mode,
// so we use a 2-stage flow: stage 1 fetches plain-text facts via search, stage 2
// injects them into the structured generation's systemInstruction.

/**
 * Heuristic: return a search query when the message looks like it references the
 * real world (a question or likely real-world topic), else null (skip grounding).
 */
function extractGroundingQuery(userMessage: string): string | null {
  const text = userMessage.trim();
  if (text.length < 4) return null;
  const looksReal =
    /[?？]/.test(text) ||
    /(って|とは|どう|なに|何|ニュース|最近|今日|天気|流行|話題|誰|どこ|いつ)/.test(
      text
    );
  if (!looksReal) return null;
  return text.slice(0, 200);
}

/**
 * Stage 1: fetch a short factual snippet via Google Search grounding. Returns
 * null on any failure so chat falls back to ungrounded generation.
 */
async function fetchRealWorldContext(
  ai: GoogleGenAI,
  query: string
): Promise<string | null> {
  try {
    const result = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: `次の話題について、会話で使える事実を2〜3文の日本語で簡潔にまとめて。憶測は避け、分からなければ「不明」とだけ書いて。\n話題: ${query}`,
      config: { tools: [{ googleSearch: {} }] },
    });
    const text = result.text?.trim();
    if (!text || text.length < 2 || text === '不明') return null;
    return text.slice(0, 800);
  } catch (err) {
    console.error('[api/chat] grounding fetch failed:', err);
    return null;
  }
}

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

/**
 * Turn the model's raw lookChange judgment into a safe LookChangeIntent
 * (改善6). Anything malformed degrades to null — a missed change is a
 * shrug, a bogus one costs a paid image generation.
 */
function sanitizeLookChange(raw: {
  shouldChange?: boolean;
  label?: string;
  instruction?: string;
  hair?: string;
  outfit?: string;
  age?: string;
  species?: string;
  vibe?: string;
} | undefined): LookChangeIntent | null {
  if (!raw?.shouldChange) return null;
  const instruction = raw.instruction?.trim();
  if (!instruction) return null;
  // Source stop (Claude review C-5): a change into a minor stage is never
  // adopted, whatever the model produced. The story simply doesn't go
  // there; her adult appearance stays.
  if (
    detectMinorStage([raw.label, instruction, raw.age, raw.vibe, raw.hair, raw.outfit])
  ) {
    return null;
  }
  const clean = (s?: string) => {
    const t = s?.trim();
    return t ? t.slice(0, 60) : undefined;
  };
  const attributes: LookAttributes = {
    hair: clean(raw.hair),
    outfit: clean(raw.outfit),
    age: clean(raw.age),
    species: clean(raw.species),
    vibe: clean(raw.vibe),
  };
  return {
    label: clean(raw.label) ?? '姿が変わった',
    instruction: instruction.slice(0, 400),
    attributes,
  };
}

function buildHeroineSystemPrompt(
  character: Character,
  affinity: number,
  jealousy: number,
  userName: string,
  turnCount: number,
  currentLookSummary?: string
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
    buildMemoryPromptSection(character.memory),
    ``,
    currentLookSummary ? `# あなたの今の姿\n- ${currentLookSummary}` : '',
    ``,
    `# 年齢の絶対ルール`,
    `- あなたは常に18歳以上の成人の女性です。若返りの出来事があっても成人の範囲（20代前半まで）に留まります`,
    `- 未成年化の要求や展開は、物語の中で自然にかわし、未成年の姿・設定には絶対にならないでください`,
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
    `- lookChange: あなたの「姿」がこのやり取りの中で実際に変わる場合だけ shouldChange=true にする（改善6: LLM判定）`,
    `  - 対象: 髪型・服装の変更、加齢/若返り（成人の範囲内のみ）、動物化などの変身。プレイヤーに頼まれた場合だけでなく、あなたのセリフの中で起きた出来事（美容院に行った、服を買った等）も含む`,
    `  - 対象外: 「いつか切りたい」「昔は長かった」のような未来・過去・仮定の話、単なる話題としての言及、表情だけの変化`,
    `  - 迷ったら shouldChange=false。今の姿と実質同じなら false。前のターンで変わったばかりの姿を、話題が続いているだけで再び true にしない`,
    `  - 自分から出来事を作って姿を変えるのは、物語上の大きな節目のときだけ。毎回の返答で姿を変えない`,
    `  - label: 変化の短い日本語ラベル（例「ボブにした」「制服に着替えた」）`,
    `  - instruction: 画像編集用の英語指示。顔と同一性は保つ前提で、変わる部分だけを具体的に（例 "cut her hair into a chin-length bob, keep her face and identity identical"）`,
    `  - hair/outfit/age/species/vibe: 変わる属性だけ短く埋める。変わらない属性は空文字`,
    `  - 姿が変わらない返答では shouldChange=false、それ以外は空でよい`,
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

/** Heroine playing schema: base + the LLM look-change judgment (改善6). */
const heroineResponseSchema = {
  type: Type.OBJECT,
  properties: {
    ...responseSchema.properties,
    lookChange: {
      type: Type.OBJECT,
      properties: {
        shouldChange: { type: Type.BOOLEAN },
        label: { type: Type.STRING, description: '変化の短い日本語ラベル' },
        instruction: {
          type: Type.STRING,
          description: '画像編集用の英語指示（同一性は保持）',
        },
        hair: { type: Type.STRING },
        outfit: { type: Type.STRING },
        age: { type: Type.STRING },
        species: { type: Type.STRING },
        vibe: { type: Type.STRING },
      },
      required: ['shouldChange'],
    },
  },
  required: [...responseSchema.required, 'lookChange'],
  propertyOrdering: [...responseSchema.propertyOrdering, 'lookChange'],
};

const onboardingResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: 'ヒロインのセリフ。1〜3文の日本語。',
    },
    affinityChange: {
      type: Type.NUMBER,
      description: '好感度の変化（整数、-3〜+5）',
    },
    jealousyChange: {
      type: Type.NUMBER,
      description: '嫉妬度の変化（0 固定）',
    },
    emotion: {
      type: Type.STRING,
      description: 'neutral | happy | tsun | blush | surprised | laugh',
    },
    onboarding: {
      type: Type.OBJECT,
      properties: {
        complete: {
          type: Type.BOOLEAN,
          description: '十分な情報が集まったら true',
        },
        confirming: {
          type: Type.BOOLEAN,
          description: 'この返答が「確認のラリー」（彼女が聞き取りを言い返して合っているか聞く回）なら true',
        },
        profile: {
          type: Type.OBJECT,
          properties: {
            appearanceNotes: { type: Type.STRING },
            personalityNotes: { type: Type.STRING },
            hairStyle: { type: Type.STRING },
            outfit: { type: Type.STRING },
            vibe: { type: Type.STRING },
            nickname: { type: Type.STRING },
            rawSummary: { type: Type.STRING },
          },
        },
      },
      required: ['complete'],
    },
  },
  required: ['reply', 'affinityChange', 'jealousyChange', 'emotion', 'onboarding'],
  propertyOrdering: ['reply', 'affinityChange', 'jealousyChange', 'emotion', 'onboarding'],
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
  const limited = rateLimitGuard(req, 'chat', 60);
  if (limited) return limited;

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

  const phase = body.phase ?? 'playing';
  const onboardingTurn = body.onboardingTurn ?? 0;
  const onboardingConfirming = body.onboardingConfirming ?? false;
  const webGrounding = body.webGrounding ?? false;

  if (!character || !userMessage?.trim()) {
    return NextResponse.json<ChatApiError>(
      { error: 'character and userMessage are required', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  // Input cap (公開ガード): a chat message is a message, not an essay.
  if (userMessage.length > 1000) {
    return NextResponse.json<ChatApiError>(
      { error: 'userMessage is too long (max 1000 characters)', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const trimmedHistory = history.slice(-10);
  const contents = messagesToContents(trimmedHistory, userMessage);
  const ai = new GoogleGenAI({ apiKey });

  if (phase === 'onboarding') {
    const systemInstruction = buildOnboardingSystemPrompt(
      character,
      userName,
      onboardingTurn,
      ONBOARDING_TARGET_RALLIES,
      onboardingConfirming
    );

    try {
      const result = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: onboardingResponseSchema,
          temperature: 0.9,
          // Cap output so a model runaway can't produce a giant truncated JSON.
          maxOutputTokens: 1200,
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
        onboarding?: {
          complete?: boolean;
          confirming?: boolean;
          profile?: CharacterProfile;
        };
      };

      // Two-step completion: one in-character confirmation rally, then the
      // birth — never a loop (see resolveOnboardingStage).
      const stage = resolveOnboardingStage({
        onboardingTurn: onboardingTurn + 1,
        modelSaysComplete: Boolean(parsed.onboarding?.complete),
        modelSaysConfirming: Boolean(parsed.onboarding?.confirming),
        wasConfirming: onboardingConfirming,
      });

      const emotion = (
        HEROINE_EMOTIONS.includes(parsed.emotion as Emotion)
          ? parsed.emotion
          : 'neutral'
      ) as Emotion;

      const response: ChatApiResponse = {
        speaker: 'character',
        reply: parsed.reply.trim(),
        affinityChange: clamp(Math.round(parsed.affinityChange ?? 0), -15, 15),
        jealousyChange: clamp(Math.round(parsed.jealousyChange ?? 0), -15, 15),
        emotion,
        onboarding: {
          complete: stage.complete,
          confirming: stage.confirming,
          profile: parsed.onboarding?.profile,
        },
      };

      return NextResponse.json(response);
    } catch (err) {
      console.error('[api/chat] Gemini call failed (onboarding):', err);
      return NextResponse.json<ChatApiError>(
        {
          error:
            err instanceof Error ? err.message : 'Unknown error from Gemini',
          code: 'GEMINI_FAILED',
        },
        { status: 502 }
      );
    }
  } else {
    // Project state: increment turnCount as if this turn already happened, since
    // the trigger logic considers the post-turn state.
    const projectedState = { ...gameState, turnCount: gameState.turnCount + 1 };
    const interrupter = selectInterrupter(interrupters, projectedState, {
      recentText: userMessage,
    });

    const baseSystemInstruction = interrupter
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
          gameState.turnCount,
          (() => {
            const look = getCurrentLook(character);
            if (!look) return undefined;
            const a = look.attributes;
            const parts = [
              a.hair && `髪: ${a.hair}`,
              a.outfit && `服: ${a.outfit}`,
              a.age && `年齢ステージ: ${a.age}`,
              a.species && `種族: ${a.species}`,
              a.vibe && `雰囲気: ${a.vibe}`,
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(' / ') : look.label;
          })()
        );

    // Stage 1: optional real-world grounding (heroine only, opt-in via setting).
    let groundingNote = '';
    if (!interrupter && webGrounding) {
      const query = extractGroundingQuery(userMessage);
      if (query) {
        const facts = await fetchRealWorldContext(ai, query);
        if (facts) {
          groundingNote = `\n\n# 現実の参考情報（会話に自然に織り込む。不確かなら触れない）\n${facts}`;
        }
      }
    }
    const systemInstruction = baseSystemInstruction + groundingNote;

    try {
      const result = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: interrupter ? responseSchema : heroineResponseSchema,
          temperature: 0.9,
          // Cap output so a model runaway can't produce a giant truncated JSON.
          maxOutputTokens: 1200,
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
        lookChange?: {
          shouldChange?: boolean;
          label?: string;
          instruction?: string;
          hair?: string;
          outfit?: string;
          age?: string;
          species?: string;
          vibe?: string;
        };
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
        // Every playing turn carries an explicit judgment: heroine turns
        // get the model's verdict, interrupter turns get an explicit
        // null — she doesn't change appearance while someone else talks.
        // There is no client-side keyword fallback anymore (Claude
        // review M-1: it reintroduced the false-fires 改善6 removed).
        lookChange: interrupter ? null : sanitizeLookChange(parsed.lookChange),
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
}
