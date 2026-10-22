# Shopify import

The importer reads the public Shopify JSON on https://luuxmart.com (no Admin API token) and writes into this app’s database. Photos are downloaded off the Shopify CDN into `frontend/public/uploads/` so the shop still works after Shopify is cancelled.

## Run

From the repo root, with the API dependencies installed:

```bash
npm run import:shopify
```

Override the source store:

```bash
SHOPIFY_ORIGIN=https://luuxmart.com npm run import:shopify
```

The script is safe to run again. Products are matched by Shopify id (or handle). Images are skipped when the local file already exists.

## What it copies

- Collections (title, handle, description, image)
- Products, options, variants, prices
- Product photos
- Collection membership
- CMS pages from `/pages.json` (skips sitemap / privacy-widget pages)
- Policy HTML from `/policies/{handle}` when present
- Homepage hero image when it can be found in the live HTML

Featured home products are those whose titles match Oboe, Laputa, Conduit, and Bowling Pin.

Historical Shopify orders and customer passwords are not imported. Export those from Shopify admin before you cancel the subscription if you need a record.
