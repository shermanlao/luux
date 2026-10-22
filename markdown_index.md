# LUUX guides

- [Admin](docs/admin.md) — staff login, products, collections, pages, shipping, orders
- [Shopify import](docs/shopify-import.md) — copy the live Shopify catalog into SQLite or Postgres
- [Stripe](docs/stripe.md) — Checkout, webhook, and test cards
- [VPS](docs/vps.md) — second site on `187.7.21.12` (ports 3001 / 3334)
- [Frontend UI](docs/frontend-ui.md) — buttons, tables, helpKey tips

## Run locally

From the repo root:

- Frontend + API: `npm run dev`
- Frontend only: `npm run dev:frontend`
- API only: `npm run dev:backend`
- Catalog import: `npm run import:shopify`
