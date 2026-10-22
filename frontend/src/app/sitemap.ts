import type { MetadataRoute } from 'next';
import { loadCollections, loadSite, siteOrigin } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const entries: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: 'weekly', priority: 1 },
    { url: `${origin}/collections`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/pages/about-us`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${origin}/pages/contact`, changeFrequency: 'monthly', priority: 0.5 },
  ];
  try {
    const collections = await loadCollections();
    for (const collection of collections) {
      entries.push({ url: `${origin}/collections/${collection.handle}`, changeFrequency: 'weekly', priority: 0.7 });
    }
    const featured = await loadSite();
    for (const handle of featured.site.featured_handles) {
      entries.push({ url: `${origin}/products/${handle}`, changeFrequency: 'weekly', priority: 0.6 });
    }
  } catch {
    /* API may be down during build */
  }
  return entries;
}
