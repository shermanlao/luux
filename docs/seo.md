# Storefront SEO

Canonical host is **https://luuxmart.com** (apex). `www` requests are redirected to apex in `frontend/src/middleware.ts`. Legacy locale prefixes (`/fr`, `/ko`, `/zh`, `/zh-HK`, `/en`, `/cn`, and nested paths) **301** to the matching English URL on apex.

## Sitemap and robots

- `GET /api/sitemap` (`backend-server/src/lib/sitemapPayload.ts`) returns each URL with `lastModified` from that row’s CMS `updatedAt` / `createdAt` (homepage from site settings).
- `frontend/src/app/sitemap.ts` maps those timestamps into `sitemap.xml` (homepage URL uses a trailing slash).
- `frontend/src/app/robots.ts` allows public pages, disallows `/cart`, `/checkout`, `/account`, `/admin`, `/api/`, and `/search`, and points to `{SITE_ORIGIN}/sitemap.xml`.

## Metadata and schema

Helpers live in `frontend/src/lib/seo.ts`:

- Per-route `generateMetadata` on home, collections, products, CMS pages, and policies (unique titles/descriptions, canonical URLs, Open Graph, Twitter).
- Homepage canonical / `og:url` use **https://luuxmart.com/** (trailing slash). `pageCanonicalUrl('/')` already returns that string, but the Metadata API strips the slash on emit — `frontend/src/components/seo/HomepageUrlHead.tsx` renders explicit `<link rel="canonical">` and `<meta property="og:url">` on the homepage (see `app/page.tsx`; homepage `generateMetadata` omits those Metadata fields). Generic CMS homepage descriptions fall back to the replica Hong Kong retailer blurb in `backend-server/src/lib/shared/home-seo.ts` (also applied in `ensureSiteSettings` on boot).
- `/search` uses `noindex, nofollow` metadata.
- `Organization` JSON-LD on the homepage; `Product` + `BreadcrumbList` on product pages. Product JSON-LD omits invalid Shopify option strings as `sku` (`jsonld-sku.ts`).
- Cart, checkout, and account layouts set `robots: noindex`.

## Redirects

`frontend/next.config.ts` permanent redirects include `/about`, `/contact`, `/shipping`, stale product handles, and the Shooting Star slug cleanup. `/products/bowling-pin-pendant-lamp` **301**s to the live Bowling Pin handle in middleware (typo slug remains a config **308**). `/favicon.ico` rewrites to `/images/luux-mark.jpg`.

## IndexNow (Bing)

- Key file: `frontend/public/{INDEXNOW_KEY}.txt` (default key `8f3a2c1b9e4d7046a5b8c3d2e1f0a9b`, overridable via `INDEXNOW_KEY`).
- After each API boot on production (`SITE_ORIGIN` contains `luuxmart.com`), `backend-server/src/lib/shared/indexnow.ts` POSTs the sitemap URL and each sitemap path to `https://api.indexnow.org/indexnow`. HTTP **200** or **202** means the submission was received (not that URLs are indexed). Set `INDEXNOW_DISABLE=1` to skip.

## Boot migrations

`ensureSiteSettings` removes generic Threads/Pinterest homepages, fixes a bare Instagram root URL to `luuxlighting`, and maps stale Bowling Pin featured handles (`…-droplight-fxture` or `bowling-pin-pendant-lamp`) to the live product handle `led-pendant-lights-chandelier-mirror-lamp-home-kitchen-island-dining-living-room`.

Legal policy HTML migrations are documented in [Policy content migration](policy-content-migration.md).