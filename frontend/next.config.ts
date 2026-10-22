import type { NextConfig } from 'next';
import path from 'path';

const apiOrigin = process.env.API_ORIGIN || 'http://127.0.0.1:3333';

function publicOriginIsHttps(): boolean {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_ORIGIN || '';
  return origin.startsWith('https://');
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    localPatterns: [
      { pathname: '/images/**' },
      { pathname: '/uploads/**' },
    ],
  },
  async headers() {
    const security = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ];
    if (publicOriginIsHttps()) {
      security.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }
    return [{ source: '/:path*', headers: security }];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
        { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
      ],
    };
  },
};

export default nextConfig;
