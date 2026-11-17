import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { MAX_MEMORY_FACTS, MEMORY_SUMMARY_WINDOW } from '@/lib/memory';
import { rateLimitGuard } from '@/lib/rate-limit';
import type {
  SummarizeMemoryError,
  SummarizeMemoryRequest,
  SummarizeMemoryResponse,
} from '@/lib/api-types';

export const runtime = 'nodejs';

// Same chat model as /api/chat (single source of truth there; kept in sync
// manually — summarization is a light task for the Flash tier).
const CHAT_MODEL = 'gemini-4-hydrogen';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        '二人の関係と会話の流れの要約。日本語で200文字以内、彼女視点の事実ベース。',
    },
    facts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        '今後も覚えておくべき具体的な事実（好み・約束・出来事・呼び方など）。短い文で最大12件。',
    },
  },
  required: ['summary', 'facts'],
  propertyOrdering: ['summary', 'facts'],
};

export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'memory-summarize', 15);
  if (limited) return limited;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json<SummarizeMemoryError>(
      { error: 'GEMINI_API_KEY not configured', code: 'NO_API_KEY' },
      { status: 500 }
    );
  }

  let body: SummarizeMemoryRequest;
  try {
    body = (await req.json()) as SummarizeMemoryRequest;
  } catch {
    return NextResponse.json<SummarizeMemoryError>(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const { characterName, userName, existingMemory } = body;
  const messages = (body.messages ?? [])
    .filter((m) => !m.systemNote && m.content?.trim())
    .slice(-MEMORY_SUMMARY_WINDOW);

  if (!characterName?.trim() || messages.length === 0) {
    return NextResponse.json<SummarizeMemoryError>(
      { error: 'characterName and messages are required', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const transcript = messages
    .map((m) => `${m.role === 'user' ? userName || 'プレイヤー' : characterName}: ${m.content}`)
    .join('\n');

  // Defensive: memory restored from older saves may lack fields.
  const existingFacts = Array.isArray(existingMemory?.facts)
    ? existingMemory.facts
    : [];
  const existingBlock = existingMemory
    ? [
        '# これまでの長期記憶（土台にして、新しい会話で更新・統合する）',
        existingMemory.summary ? `要約: ${existingMemory.summary}` : '',
        ...existingFacts.map((f) => `- ${f}`),
        '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const prompt = [
    `あなたは恋愛シミュレーションゲームの「長期記憶」を作る係です。`,
    `ヒロイン「${characterName}」がプレイヤーとの会話を後から思い出せるよう、記憶を更新してください。`,
    ``,
    existingBlock,
    `# 最近の会話`,
    transcript,
    ``,
    `# ルール`,
    `- summary: 二人の関係性と会話の流れを200文字以内で。推測で話を盛らない`,
    `- facts: 好み・約束・共有した出来事・呼び方など、具体的事実だけを最大${MAX_MEMORY_FACTS}件`,
    `- 古い記憶と矛盾する新しい事実があれば新しい方を残す`,
    `- 一時的な雑談や挨拶は事実に入れない`,
  ].join('\n');

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.4,
        maxOutputTokens: 900,
      },
    });

    const text = result.text;
    if (!text) {
      return NextResponse.json<SummarizeMemoryError>(
        { error: 'Empty response from Gemini', code: 'GEMINI_FAILED' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text) as SummarizeMemoryResponse;
    return NextResponse.json<SummarizeMemoryResponse>({
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      facts: Array.isArray(parsed.facts)
        ? parsed.facts.filter((f): f is string => typeof f === 'string')
        : [],
    });
  } catch (err) {
    console.error('[api/memory/summarize] failed:', err);
    return NextResponse.json<SummarizeMemoryError>(
      {
        error: err instanceof Error ? err.message : 'Unknown error from Gemini',
        code: 'GEMINI_FAILED',
      },
      { status: 502 }
    );
  }
}
