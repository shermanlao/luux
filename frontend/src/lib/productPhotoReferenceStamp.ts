export const PRODUCT_PHOTO_REFERENCE_PHRASE = 'Photo for reference only';

const BAR_RATIO = 0.08;
const BAR_MAX_RATIO = 0.2;
const BAR_MIN_PX = 24;

function barHeightForImage(height: number): number {
  const desired = Math.round(height * BAR_RATIO);
  const maxH = Math.max(1, Math.round(height * BAR_MAX_RATIO));
  const minH = Math.min(BAR_MIN_PX, maxH);
  return Math.max(minH, Math.min(maxH, desired));
}

export async function stampProductPhotoReferenceBar(imageSrc: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not draw the reference bar.'));
    img.src = imageSrc;
  });
  const width = Math.max(1, img.naturalWidth);
  const height = Math.max(1, img.naturalHeight);
  const barHeight = barHeightForImage(height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height + barHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not draw the reference bar.');
  ctx.drawImage(img, 0, 0, width, height);
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, height, width, barHeight);
  const phrase = PRODUCT_PHOTO_REFERENCE_PHRASE;
  const maxTextWidth = width * 0.92;
  let fontSize = Math.max(10, Math.round(barHeight * 0.42));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  while (fontSize > 8) {
    ctx.font = `600 ${fontSize}px sans-serif`;
    if (ctx.measureText(phrase).width <= maxTextWidth) break;
    fontSize -= 1;
  }
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.fillText(phrase, width / 2, height + barHeight / 2);
  return canvas.toDataURL('image/png');
}
