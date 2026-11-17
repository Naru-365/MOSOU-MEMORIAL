import { formatLookDate, getLookImageSrc } from './memorial';
import type { Look } from './types';

/**
 * Share-card composition (改善3a).
 *
 * Draws a look portrait onto a 1080x1440 canvas with the character name,
 * look label and date burned into a bottom band, and returns a PNG blob
 * the caller can download / hand to the share sheet. Returns null when the
 * image cannot be drawn (e.g. a cross-origin image without CORS headers
 * taints the canvas) — callers then fall back to the original image URL.
 */
export async function composeShareImage(
  characterName: string,
  look: Look
): Promise<Blob | null> {
  const src = getLookImageSrc(look);
  if (!src) return null;

  const img = await loadImage(src).catch(() => null);
  if (!img) return null;

  const W = 1080;
  const H = 1440;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Cover-fit the portrait.
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

  // Bottom band with the memorial text.
  const bandH = 300;
  const grad = ctx.createLinearGradient(0, H - bandH, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.72)');
  grad.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - bandH, W, bandH);

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 64px sans-serif';
  ctx.fillText(characterName, 56, H - 168, W - 112);
  ctx.font = '400 44px sans-serif';
  ctx.fillText(look.label, 56, H - 100, W - 112);
  ctx.font = '400 34px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(formatLookDate(look.createdAt), 56, H - 44, W - 112);

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch {
      // Tainted canvas (non-CORS remote image): caller falls back.
      resolve(null);
    }
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Ask for CORS so Storage URLs (which serve ACAO:*) stay untainted.
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Trigger a browser download for a blob or URL. */
export function downloadFile(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
