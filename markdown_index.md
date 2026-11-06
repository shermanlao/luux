# LUUX guides

- [Admin](docs/admin.md) — staff login, products, collections, pages, shipping, orders, messages, email, and shop chat
- [Customer accounts](docs/account.md) — email sign-in, password confirmation, Google and Facebook
- [Shopify import](docs/shopify-import.md) — copy the live Shopify catalog into SQLite or Postgres
- [Stripe](docs/stripe.md) — Checkout, webhook, and test cards
- [Marketing](docs/marketing.md) — campaign JSON, bearer API, and social tokens
- [VPS](docs/vps.md) — second site on `187.7.21.12` (ports 3001 / 3334)
- [Frontend UI](docs/frontend-ui.md) — buttons, tables, helpKey tips, currency selector

## Run locally

From the repo root (a `\\LIGHTX\web\luux` share is fine; Windows may print a UNC warning, then the script continues from a mapped drive):

- Frontend + API: `npm run dev`
- Frontend only: `npm run dev:frontend`
- API only: `npm run dev:backend`
- Staff backend: http://127.0.0.1:3000/admin
- Catalog import: `npm run import:shopify`
