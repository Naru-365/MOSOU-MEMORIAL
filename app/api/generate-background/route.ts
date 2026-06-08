import { NextRequest, NextResponse } from 'next/server';
import { buildBackgroundPrompt } from '@/lib/image-prompt';
import {
  getSupabaseAdmin,
  ensureLookImagesBucket,
  LOOK_IMAGES_BUCKET,
} from '@/lib/supabase/admin';
import type {
  GenerateBackgroundRequest,
  GenerateBackgroundResponse,
  GenerateBackgroundError,
} from '@/lib/api-types';

export const runtime = 'nodejs';

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SAVE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json<GenerateBackgroundError>(
      { error: 'OPENAI_API_KEY not configured', code: 'NO_IMAGE_API' },
      { status: 503 }
    );
  }

  let body: GenerateBackgroundRequest;
  try {
    body = (await req.json()) as GenerateBackgroundRequest;
  } catch {
    return NextResponse.json<GenerateBackgroundError>(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const { saveId, characterId, characterName, profile, attributes } = body;
  const sceneDescription =
    typeof body.sceneDescription === 'string'
      ? body.sceneDescription.slice(0, 300)
      : undefined;
  if (!characterName?.trim()) {
    return NextResponse.json<GenerateBackgroundError>(
      { error: 'characterName is required', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }
  if (typeof saveId !== 'string' || !SAVE_ID_RE.test(saveId) || typeof characterId !== 'string' || !ID_RE.test(characterId)) {
    return NextResponse.json<GenerateBackgroundError>(
      { error: 'Invalid saveId/characterId', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const prompt = buildBackgroundPrompt(profile, attributes, sceneDescription);

  // Generate one background (retry once on a transient failure).
  const generate = async (): Promise<string | null> => {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-2', prompt, size: '1024x1536', quality: 'low', n: 1 }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        console.error(`[api/generate-background] failed (${res.status}): ${errText.slice(0, 300)}`);
        return null;
      }
      const json = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = json.data?.[0]?.b64_json;
      return b64 ? `data:image/png;base64,${b64}` : null;
    } catch (err) {
      console.error('[api/generate-background]', err);
      return null;
    }
  };

  let image = await generate();
  if (!image) image = await generate();
  if (!image) {
    return NextResponse.json<GenerateBackgroundError>(
      { error: 'OpenAI failed to generate the background', code: 'OPENAI_FAILED' },
      { status: 502 }
    );
  }

  // Persist to Supabase Storage when configured; otherwise return the data URL only.
  let imageUrl: string | undefined;
  const client = getSupabaseAdmin();
  if (client) {
    try {
      await ensureLookImagesBucket(client);
      const buf = Buffer.from(image.replace(/^data:[^;]+;base64,/, ''), 'base64');
      const path = `${saveId}/${characterId}/background.png`;
      const { error } = await client.storage.from(LOOK_IMAGES_BUCKET).upload(path, buf, {
        contentType: 'image/png',
        upsert: true,
      });
      if (error) {
        console.error('[api/generate-background] upload failed:', error.message);
      } else {
        imageUrl = client.storage.from(LOOK_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
      }
    } catch (err) {
      console.error('[api/generate-background] storage error:', err);
    }
  }

  return NextResponse.json<GenerateBackgroundResponse>({ image, imageUrl });
}
