import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdmin,
  ensureLookImagesBucket,
  LOOK_IMAGES_BUCKET,
} from '@/lib/supabase/admin';
import type { Emotion } from '@/lib/types';
import type {
  UploadLookRequest,
  UploadLookResponse,
  UploadLookError,
} from '@/lib/api-types';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB per image
const MAX_IMAGES_PER_REQUEST = 16; // covers the 8 heroine emotions with headroom
const MAX_BODY_BYTES = 64 * 1024 * 1024; // hard cap on the whole request body
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/; // characterId / lookId
const SAVE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/; // saveId: require real entropy
const EMOTION_KEY_RE = /^[A-Za-z0-9_-]{1,32}$/; // storage filename segment

function decodeDataUrl(input: string): Buffer | null {
  const b64 = input.replace(/^data:[^;]+;base64,/, '');
  try {
    const buf = Buffer.from(b64, 'base64');
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const client = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json<UploadLookError>(
      { error: 'Supabase not configured', code: 'NO_SUPABASE' },
      { status: 503 }
    );
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json<UploadLookError>(
      { error: 'Request body too large', code: 'TOO_LARGE' },
      { status: 413 }
    );
  }

  let body: UploadLookRequest;
  try {
    body = (await req.json()) as UploadLookRequest;
  } catch {
    return NextResponse.json<UploadLookError>(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const { saveId, characterId, lookId, images, referenceImage } = body;
  if (
    typeof saveId !== 'string' ||
    !SAVE_ID_RE.test(saveId) ||
    ![characterId, lookId].every((v) => typeof v === 'string' && ID_RE.test(v))
  ) {
    return NextResponse.json<UploadLookError>(
      { error: 'Invalid saveId/characterId/lookId', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }
  if (!images || typeof images !== 'object') {
    return NextResponse.json<UploadLookError>(
      { error: 'images object is required', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }
  if (Object.keys(images).length > MAX_IMAGES_PER_REQUEST) {
    return NextResponse.json<UploadLookError>(
      { error: 'Too many images in one request', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  try {
    await ensureLookImagesBucket(client);

    // Validate emotion keys: they become a storage filename segment, so reject
    // anything outside the safe charset to prevent path traversal / overwrite.
    const entries: [string, string][] = Object.entries(images).filter(
      ([k, v]) => EMOTION_KEY_RE.test(k) && typeof v === 'string' && v
    ) as [string, string][];
    if (referenceImage && typeof referenceImage === 'string') {
      entries.push(['_reference', referenceImage]);
    }

    const imageUrls: Partial<Record<Emotion, string>> = {};
    let referenceImageUrl: string | undefined;

    for (const [key, dataUrl] of entries) {
      const buf = decodeDataUrl(dataUrl);
      if (!buf) continue;
      if (buf.length > MAX_IMAGE_BYTES) {
        return NextResponse.json<UploadLookError>(
          { error: `Image '${key}' exceeds the ${MAX_IMAGE_BYTES}-byte limit`, code: 'TOO_LARGE' },
          { status: 413 }
        );
      }
      const path = `${saveId}/${characterId}/${lookId}/${key}.png`;
      const { error } = await client.storage.from(LOOK_IMAGES_BUCKET).upload(path, buf, {
        contentType: 'image/png',
        upsert: true,
      });
      if (error) {
        return NextResponse.json<UploadLookError>(
          { error: `Upload failed for '${key}': ${error.message}`, code: 'UPLOAD_FAILED' },
          { status: 502 }
        );
      }
      const { data } = client.storage.from(LOOK_IMAGES_BUCKET).getPublicUrl(path);
      if (key === '_reference') referenceImageUrl = data.publicUrl;
      else imageUrls[key as Emotion] = data.publicUrl;
    }

    return NextResponse.json<UploadLookResponse>({ imageUrls, referenceImageUrl });
  } catch (err) {
    console.error('[api/looks/upload]', err);
    return NextResponse.json<UploadLookError>(
      { error: err instanceof Error ? err.message : 'Unknown error during upload', code: 'UPLOAD_FAILED' },
      { status: 502 }
    );
  }
}
