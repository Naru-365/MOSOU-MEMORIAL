import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { buildSystemInstruction, buildHistoryContents } from '@/lib/persona';
import type { AIChatResponse, Character, Message } from '@/lib/types';

export const runtime = 'nodejs';

interface ChatRequestBody {
  character: Character;
  affinity: number;
  jealousy: number;
  history: Message[];
  userMessage: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING },
    affinityDelta: { type: Type.INTEGER },
    emotion: {
      type: Type.STRING,
      enum: ['neutral', 'happy', 'shy', 'worried', 'angry'],
    },
    innerThought: { type: Type.STRING },
  },
  required: ['message', 'affinityDelta', 'emotion'],
  propertyOrdering: ['message', 'affinityDelta', 'emotion', 'innerThought'],
};

function clampDelta(n: unknown): number {
  const v = typeof n === 'number' ? n : parseInt(String(n ?? 0), 10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(-20, Math.min(20, Math.round(v)));
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured. Add it to Vercel environment variables.' },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { character, affinity, jealousy, history, userMessage } = body;
  if (!character || typeof userMessage !== 'string' || !userMessage.trim()) {
    return NextResponse.json({ error: 'Missing character or userMessage' }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(character, affinity, jealousy);
  const contents = [
    ...buildHistoryContents(history),
    { role: 'user' as const, parts: [{ text: userMessage }] },
  ];

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.9,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = result.text ?? '';
    let parsed: Partial<AIChatResponse>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'AI returned non-JSON response', raw: text },
        { status: 502 }
      );
    }

    const safe: AIChatResponse = {
      message: typeof parsed.message === 'string' && parsed.message.trim() ? parsed.message.trim() : '…',
      affinityDelta: clampDelta(parsed.affinityDelta),
      emotion: ['neutral', 'happy', 'shy', 'worried', 'angry'].includes(parsed.emotion as string)
        ? (parsed.emotion as AIChatResponse['emotion'])
        : 'neutral',
      innerThought: typeof parsed.innerThought === 'string' ? parsed.innerThought : undefined,
    };

    return NextResponse.json(safe);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Gemini API error: ${message}` }, { status: 502 });
  }
}
