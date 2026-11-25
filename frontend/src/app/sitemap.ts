import type { MetadataRoute } from 'next';
import { apiGet, siteOrigin } from '@/lib/api';

type SitemapPayload = {
  generatedAt: string;
  static: Array<{ path: string }>;
  collections: Array<{ path: string }>;
  products: Array<{ path: string }>;
  pages: Array<{ path: string }>;
};

function entry(path: string, lastModified: Date, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']) {
  const origin = siteOrigin();
  return {
    url: `${origin}${path}`,
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

  const lastModified = new Date(payload.generatedAt);
  const entries: MetadataRoute.Sitemap = [];
  for (const row of payload.static) entries.push(entry(row.path, lastModified, 1, 'weekly'));
  for (const row of payload.collections) entries.push(entry(row.path, lastModified, row.path === '/collections' ? 0.8 : 0.7, 'weekly'));
  for (const row of payload.products) entries.push(entry(row.path, lastModified, 0.6, 'weekly'));
  for (const row of payload.pages) entries.push(entry(row.path, lastModified, row.path.includes('/policies/') ? 0.5 : 0.55, 'monthly'));
  return entries;
}