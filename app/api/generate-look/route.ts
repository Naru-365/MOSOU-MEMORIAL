import { NextRequest, NextResponse } from 'next/server';
import { buildBaseLookPrompt, buildEditPrompt, buildLookPromptForEmotion } from '@/lib/image-prompt';
import type { GenerateLookError, GenerateLookRequest, GenerateLookResponse } from '@/lib/api-types';
import type { Emotion } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json<GenerateLookError>(
      { error: 'OPENAI_API_KEY not configured', code: 'NO_IMAGE_API' },
      { status: 503 }
    );
  }

  let body: GenerateLookRequest;
  try {
    body = (await req.json()) as GenerateLookRequest;
  } catch {
    return NextResponse.json<GenerateLookError>(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const { characterName, profile, attributes, changeInstruction, referenceImage } = body;

  if (!characterName?.trim()) {
    return NextResponse.json<GenerateLookError>(
      { error: 'characterName is required', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  // Ensure 'neutral' is always included so we always have a reference image
  const requestedEmotions: Emotion[] =
    body.emotions && body.emotions.length > 0 ? body.emotions : ['neutral'];
  const emotions: Emotion[] = requestedEmotions.includes('neutral')
    ? requestedEmotions
    : ['neutral', ...requestedEmotions];

  const size = body.size ?? '1024x1536';
  const quality = body.quality ?? 'low';

  const base = buildBaseLookPrompt(characterName, profile, attributes);

  const images: Partial<Record<Emotion, string>> = {};

  try {
    for (const emotion of emotions) {
      let b64: string | undefined;

      if (referenceImage) {
        // EDITS endpoint — identity-preserving
        const b64Input = referenceImage.replace(/^data:[^;]+;base64,/, '');
        const buf = Buffer.from(b64Input, 'base64');

        const form = new FormData();
        form.append('model', 'gpt-image-2');
        form.append('prompt', buildEditPrompt(base, changeInstruction, emotion));
        form.append('size', size);
        form.append('quality', quality);
        form.append('image[]', new Blob([buf], { type: 'image/png' }), 'reference.png');

        const res = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          // Do NOT set Content-Type; FormData sets the boundary automatically
          body: form,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          return NextResponse.json<GenerateLookError>(
            { error: `OpenAI edits failed for emotion '${emotion}': ${errText}`, code: 'OPENAI_FAILED' },
            { status: 502 }
          );
        }

        const json = (await res.json()) as { data?: { b64_json?: string }[] };
        b64 = json.data?.[0]?.b64_json;
      } else {
        // GENERATIONS endpoint — first look
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-image-2',
            prompt: buildLookPromptForEmotion(base, emotion),
            size,
            quality,
            n: 1,
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          return NextResponse.json<GenerateLookError>(
            { error: `OpenAI generations failed for emotion '${emotion}': ${errText}`, code: 'OPENAI_FAILED' },
            { status: 502 }
          );
        }

        const json = (await res.json()) as { data?: { b64_json?: string }[] };
        b64 = json.data?.[0]?.b64_json;
      }

      if (!b64) {
        return NextResponse.json<GenerateLookError>(
          { error: `No image data returned by OpenAI for emotion '${emotion}'`, code: 'OPENAI_FAILED' },
          { status: 502 }
        );
      }

      images[emotion] = `data:image/png;base64,${b64}`;
    }

    const referenceImageOut = images['neutral']!;

    return NextResponse.json<GenerateLookResponse>({
      images,
      referenceImage: referenceImageOut,
      basePrompt: base,
      attributes: attributes ?? {},
    });
  } catch (err) {
    console.error('[api/generate-look]', err);
    return NextResponse.json<GenerateLookError>(
      {
        error: err instanceof Error ? err.message : 'Unknown error during image generation',
        code: 'OPENAI_FAILED',
      },
      { status: 502 }
    );
  }
}
