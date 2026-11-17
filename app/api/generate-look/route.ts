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

  // Fresh generations must include 'neutral' (it becomes the reference).
  // Edit calls already carry a reference, so they generate exactly what was
  // asked for — expression-only calls skip a redundant neutral regeneration.
  const requestedEmotions: Emotion[] =
    body.emotions && body.emotions.length > 0 ? body.emotions : ['neutral'];
  const emotions: Emotion[] =
    requestedEmotions.includes('neutral') || referenceImage
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

  // A requested 'neutral' is ALWAYS required (retry once on a transient
  // failure). Callers that ask for a new neutral — first look, appearance
  // changes, micro-adjustments — are asking for a NEW portrait; silently
  // returning the input reference as if it were the new image would fake a
  // successful change (Claude review, Critical). Expression-only calls do
  // not request neutral, so they stay best-effort per emotion.
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

  // Nothing at all was generated (e.g. every requested expression failed):
  // that is a failure, not a success carrying zero images.
  if (Object.keys(images).length === 0) {
    return NextResponse.json<GenerateLookError>(
      { error: 'OpenAI failed to generate any image', code: 'OPENAI_FAILED' },
      { status: 502 }
    );
  }

  // Expression-only calls make no new neutral; the supplied reference stays
  // the reference. A requested-and-generated neutral always wins.
  const referenceImageOut = images['neutral'] ?? referenceImage;
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
