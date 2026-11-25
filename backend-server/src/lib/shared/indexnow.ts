import fs from 'fs';
import path from 'path';
import { publicOriginFromEnv } from './www-to-apex';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const PRODUCTION_ORIGIN = 'https://luuxmart.com';

export const DEFAULT_INDEXNOW_KEY = '8f3a2c1b9e4d7046a5b8c3d2e1f0a9b';

function productionOrigin(): string | null {
  const env = publicOriginFromEnv();
  if (!env) return null;
  try {
    const parsed = new URL(env);
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'luuxmart.com') return null;
    return PRODUCTION_ORIGIN;
  } catch {
    return null;
  }
}

export function indexNowKey(): string {
  return String(process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY).trim() || DEFAULT_INDEXNOW_KEY;
}

function keyFileOnDisk(key: string): string | null {
  const candidates = [
    path.join(__dirname, '..', '..', '..', '..', 'frontend', 'public', `${key}.txt`),
    path.join(process.cwd(), 'frontend', 'public', `${key}.txt`),
    path.join(process.cwd(), '..', 'frontend', 'public', `${key}.txt`),
  ];
  for (const file of candidates) {
    try {
      if (fs.readFileSync(file, 'utf8').trim() === key) return file;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function indexNowKeyIsPublished(key: string = indexNowKey()): boolean {
  return keyFileOnDisk(key) !== null;
}

export function indexNowKeyLocation(origin: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/${indexNowKey()}.txt`;
}

type SitemapRow = { path: string };

function safeSitemapPath(raw: string): string | null {
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  if (path === '/') return '/';
  if (path.startsWith('//') || path.includes('://')) return null;
  if (!/^\/[a-zA-Z0-9._~%-]+(?:\/[a-zA-Z0-9._~%-]+)*\/?$/.test(path)) return null;
  return path;
}

export function indexNowUrlList(origin: string, rows: SitemapRow[]): string[] {
  if (origin !== PRODUCTION_ORIGIN) return [];
  const urls = new Set<string>([`${PRODUCTION_ORIGIN}/sitemap.xml`]);
  for (const row of rows) {
    const safe = safeSitemapPath(row.path);
    if (!safe) continue;
    urls.add(safe === '/' ? `${PRODUCTION_ORIGIN}/` : `${PRODUCTION_ORIGIN}${safe}`);
  }
  return [...urls];
}

export async function submitIndexNow(urlList: string[]): Promise<{ ok: boolean; status: number }> {
  const origin = productionOrigin();
  const key = indexNowKey();
  if (!origin || urlList.length === 0 || !indexNowKeyIsPublished(key)) {
    return { ok: false, status: 0 };
  }
  const filtered = urlList.filter((url) => url.startsWith(`${PRODUCTION_ORIGIN}/`) || url === `${PRODUCTION_ORIGIN}/sitemap.xml`);
  if (!filtered.length) return { ok: false, status: 0 };
  const body = {
    host: 'luuxmart.com',
    key,
    keyLocation: indexNowKeyLocation(origin),
    urlList: filtered.slice(0, 10_000),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const ok = response.status === 200 || response.status === 202;
    if (!ok) {
      console.warn(`IndexNow submit returned ${response.status}`);
    }
    return { ok, status: response.status };
  } catch (error) {
    console.warn('IndexNow submit failed', error);
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export type IndexNowPayload = {
  static: SitemapRow[];
  collections: SitemapRow[];
  products: SitemapRow[];
  pages: SitemapRow[];
};

export async function runIndexNowAfterBoot(payload: IndexNowPayload): Promise<void> {
  if (process.env.INDEXNOW_DISABLE === '1' || process.env.INDEXNOW_DISABLE === 'true') return;
  const origin = productionOrigin();
  if (!origin) return;
  const rows = [...payload.static, ...payload.collections, ...payload.products, ...payload.pages];
  const urlList = indexNowUrlList(origin, rows);
  await submitIndexNow(urlList);
}