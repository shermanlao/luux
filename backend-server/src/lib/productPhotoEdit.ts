import fs from 'fs';
import path from 'path';
import { absoluteUploadPath, ensureDir, publicUploadPath, uploadsRoot } from './uploads';

const IMAGE_MODEL = 'grok-imagine-image-2.0';
const MAX_DATA_URL = 14 * 1024 * 1024;

function editPrompt(instruction: string, slotLabel: string): string {
  return [
    'Edit this lighting catalog photo.',
    slotLabel ? `This is ${slotLabel}.` : '',
    'Do not paint the instruction, chat, or any notes onto the image.',
    `Change: ${instruction}`,
    'Keep the lamp recognizable unless the change asks otherwise.',
  ]
    .filter(Boolean)
    .join('\n');
}

function mimeFromExt(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

export function uploadFileFromPublicSrc(src: string): string {
  const clean = src.split('?')[0];
  if (!clean.startsWith('/uploads/')) throw new Error('Photo not found.');
  const relative = clean.slice('/uploads/'.length);
  if (!relative || relative.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('Photo not found.');
  }
  const file = path.resolve(absoluteUploadPath(...relative.split('/')));
  const root = path.resolve(uploadsRoot);
  const fromRoot = path.relative(root, file);
  if (!fromRoot || fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) throw new Error('Photo not found.');
  if (!fs.existsSync(file)) throw new Error('Photo not found.');
  return file;
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) throw new Error('The photo could not be read.');
  if (dataUrl.length > MAX_DATA_URL) throw new Error('That photo is too large to edit.');
  const mime = match[1].toLowerCase();
  const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : mime === 'image/gif' ? '.gif' : '.jpg';
  return { buffer: Buffer.from(match[2].replace(/\s/g, ''), 'base64'), ext };
}

function writeProductImage(buffer: Buffer, ext: string): string {
  const folder = absoluteUploadPath('products');
  ensureDir(folder);
  const filename = `ai-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  fs.writeFileSync(path.join(folder, filename), buffer);
  return publicUploadPath('products', filename);
}

export function saveProductImageDataUrl(dataUrl: string): string {
  const { buffer, ext } = dataUrlToBuffer(dataUrl);
  if (!buffer.length) throw new Error('The photo could not be read.');
  return writeProductImage(buffer, ext);
}

async function imageInput(src: string, imageDataUrl: string): Promise<string> {
  if (imageDataUrl.startsWith('data:image/')) return imageDataUrl;
  if (src.startsWith('/uploads/')) {
    const file = uploadFileFromPublicSrc(src);
    const buffer = fs.readFileSync(file);
    return `data:${mimeFromExt(file)};base64,${buffer.toString('base64')}`;
  }
  throw new Error('Photo not found.');
}

function apiMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string };
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error.trim();
    if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) return parsed.error.message.trim();
  } catch {
    /* the body was not JSON */
  }
  return '';
}

export async function editProductPhotoFile(input: {
  src: string;
  imageDataUrl: string;
  instruction: string;
  slotLabel: string;
  baseUrl: string;
  apiKey: string;
}): Promise<string> {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error('Describe the change first.');
  if (!input.apiKey.trim()) throw new Error('Add an AI key on Integrations.');
  const image = await imageInput(input.src, input.imageDataUrl);
  const base = (input.baseUrl || 'https://api.x.ai/v1').replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: editPrompt(instruction, input.slotLabel),
      n: 1,
      response_format: 'b64_json',
      image: { url: image, type: 'image_url' },
    }),
    signal: AbortSignal.timeout(120000),
  });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('The photo edit took too long.');
    }
    throw error;
  }
  if (!response.ok) {
    const detail = apiMessage(await response.text().catch(() => '')).slice(0, 300);
    throw new Error(detail || 'The photo could not be edited.');
  }
  const payload = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = payload.data?.[0];
  if (item?.b64_json) return writeProductImage(Buffer.from(item.b64_json, 'base64'), '.png');
  if (item?.url && item.url.startsWith('https://')) {
    const downloaded = await fetch(item.url, { signal: AbortSignal.timeout(30000) });
    if (!downloaded.ok) throw new Error('The edited photo could not be saved.');
    const type = downloaded.headers.get('content-type') || '';
    const ext = type.includes('jpeg') ? '.jpg' : type.includes('webp') ? '.webp' : '.png';
    return writeProductImage(Buffer.from(await downloaded.arrayBuffer()), ext);
  }
  throw new Error('The edited photo could not be saved.');
}
