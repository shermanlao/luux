import fs from 'fs';
import path from 'path';

export const uploadsRoot = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'uploads');

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function publicUploadPath(...parts: string[]): string {
  return `/uploads/${parts.join('/')}`.replace(/\/+/g, '/');
}

export function absoluteUploadPath(...parts: string[]): string {
  return path.join(uploadsRoot, ...parts);
}

export function extensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).split('?')[0].toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) return ext;
  } catch {
    /* ignore */
  }
  return '.jpg';
}
