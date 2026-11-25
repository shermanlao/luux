# Storefront SEO

Canonical host is **https://luuxmart.com** (apex). `www` requests are redirected to apex in `frontend/src/middleware.ts`.

## Sitemap and robots

- `frontend/src/app/sitemap.ts` builds from `GET /api/sitemap` (all published products, collections, CMS pages, and policies) with `lastModified` from the API `generatedAt` timestamp.
- `frontend/src/app/robots.ts` allows public pages, disallows `/cart`, `/checkout`, `/account`, `/admin`, and `/api/`, and points to `{SITE_ORIGIN}/sitemap.xml`.

## Metadata and schema

Helpers live in `frontend/src/lib/seo.ts`:

- Per-route `generateMetadata` on home, collections, products, CMS pages, and policies (unique titles/descriptions, canonical URLs, Open Graph, Twitter).
- `Organization` JSON-LD on the homepage; `Product` + `BreadcrumbList` on product pages.
- Cart, checkout, and account layouts set `robots: noindex`.

## Redirects

`frontend/next.config.ts` permanent redirects include `/about`, `/contact`, `/shipping`, stale product handles, and the Shooting Star slug cleanup. `/favicon.ico` rewrites to `/images/luux-mark.jpg`.

## Boot migrations

`ensureSiteSettings` removes generic Threads/Pinterest homepages, fixes a bare Instagram root URL to `luuxlighting`, and maps stale Bowling Pin featured handles (`…-droplight-fxture` or `bowling-pin-pendant-lamp`) to the live product handle `led-pendant-lights-chandelier-mirror-lamp-home-kitchen-island-dining-living-room`.

Legal policy HTML migrations are documented in [Policy content migration](policy-content-migration.md).