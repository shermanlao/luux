import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/api';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/cart', '/checkout', '/account', '/admin', '/api/', '/search'],
      },
    ],
    sitemap: `${siteOrigin()}/sitemap.xml`,
    host: siteOrigin().replace(/^https?:\/\//, ''),
  };
}