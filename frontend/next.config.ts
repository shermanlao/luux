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
        { source: '/favicon.ico', destination: '/images/luux-mark.jpg' },
        { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
        { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
      ],
    };
  },
  async redirects() {
    return [
      { source: '/about', destination: '/pages/about-us', permanent: true },
      { source: '/pages/about', destination: '/pages/about-us', permanent: true },
      { source: '/contact', destination: '/pages/contact', permanent: true },
      { source: '/shipping', destination: '/policies/shipping-policy', permanent: true },
      {
        source:
          '/products/italian-designer-table-lamp-led-crystal-eye-of-the-sky-free-shipping-egg-shaped-lamps-living-bedroom-decor-light-night-projector',
        destination:
          '/products/italian-designer-table-lamp-led-crystal-eye-of-the-sky-egg-shaped-lamps-living-bedroom-decor-light-night-projector',
        permanent: true,
      },
      {
        source:
          '/products/led-pendant-lights-chandelier-mirror-lamp-home-kitchen-island-dining-living-room-bar-cafe-droplight-fxture',
        destination:
          '/products/led-pendant-lights-chandelier-mirror-lamp-home-kitchen-island-dining-living-room',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
