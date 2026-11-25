import type { MetadataRoute } from 'next';
import { apiGet, siteOrigin } from '@/lib/api';

type SitemapPayload = {
  generatedAt: string;
  static: Array<{ path: string; lastModified?: string }>;
  collections: Array<{ path: string; lastModified?: string }>;
  products: Array<{ path: string; lastModified?: string }>;
  pages: Array<{ path: string; lastModified?: string }>;
};

function parseLastModified(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function entry(
  path: string,
  lastModified: Date,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
) {
  const origin = siteOrigin();
  const url = path === '/' ? `${origin}/` : `${origin}${path}`;
  return {
    url,
    lastModified,
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  let payload: SitemapPayload | null = null;
  try {
    payload = await apiGet<SitemapPayload>('/api/sitemap');
  } catch {
    return [
      entry('/', new Date(), 1, 'weekly'),
      { url: `${origin}/collections`, changeFrequency: 'weekly', priority: 0.8 },
    ];
  }

  const fallback = new Date(payload.generatedAt);
  const entries: MetadataRoute.Sitemap = [];
  for (const row of payload.static) entries.push(entry(row.path, parseLastModified(row.lastModified, fallback), 1, 'weekly'));
  for (const row of payload.collections)
    entries.push(entry(row.path, parseLastModified(row.lastModified, fallback), row.path === '/collections' ? 0.8 : 0.7, 'weekly'));
  for (const row of payload.products) entries.push(entry(row.path, parseLastModified(row.lastModified, fallback), 0.6, 'weekly'));
  for (const row of payload.pages)
    entries.push(entry(row.path, parseLastModified(row.lastModified, fallback), row.path.includes('/policies/') ? 0.5 : 0.55, 'monthly'));
  return entries;
}