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

  // Generate one emotion. Returns the data URL, or null on any failure (never
  // throws for an OpenAI non-ok) so callers can degrade gracefully.
  const generateOne = async (emotion: Emotion): Promise<string | null> => {
    try {
      let res: Response;
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
        // Do NOT set Content-Type; FormData sets the boundary automatically.
        res = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });
      } else {
        // GENERATIONS endpoint — first look
        res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-image-2',
            prompt: buildLookPromptForEmotion(base, emotion),
            size,
            quality,
            n: 1,
          }),
        });
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        console.error(`[api/generate-look] '${emotion}' failed (${res.status}): ${errText.slice(0, 300)}`);
        return null;
      }
      const json = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = json.data?.[0]?.b64_json;
      return b64 ? `data:image/png;base64,${b64}` : null;
    } catch (err) {
      console.error('[api/generate-look]', emotion, err);
      return null;
    }
  };

  // 'neutral' is the reference image and MUST succeed (retry once on a transient
  // failure). Other emotions are best-effort: a failure degrades to the neutral
  // image (see resolveCharacterAsset) instead of failing the whole look — so a
  // single flaky generation never drops the user back to a silhouette.
  for (const emotion of emotions) {
    const required = emotion === 'neutral';
    let img = await generateOne(emotion);
    if (!img && required) {
      img = await generateOne(emotion); // one retry for the reference
    }
    if (img) {
      images[emotion] = img;
    } else if (required) {
      return NextResponse.json<GenerateLookError>(
        { error: 'OpenAI failed to generate the reference (neutral) image', code: 'OPENAI_FAILED' },
        { status: 502 }
      );
    }
  }

  const referenceImageOut = images['neutral'];
  if (!referenceImageOut) {
    return NextResponse.json<GenerateLookError>(
      { error: 'No neutral image available as reference', code: 'OPENAI_FAILED' },
      { status: 502 }
    );
  }

  return NextResponse.json<GenerateLookResponse>({
    images,
    referenceImage: referenceImageOut,
    basePrompt: base,
    attributes: attributes ?? {},
  });
}
