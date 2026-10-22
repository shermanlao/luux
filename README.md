# LUUX

Shop for [luuxmart.com](https://luuxmart.com): Next.js storefront plus Express API. Local development uses SQLite. Production uses PostgreSQL on the same VPS as LEVO.

See [markdown_index.md](markdown_index.md) for guides.

## Run

```bash
npm install
cd frontend && npm install
cd ../backend-server && npm install
cd ..
npm run dev
```

- Site: http://localhost:3000
- API: http://127.0.0.1:3333
- Admin: http://localhost:3000/admin (first login `admin@luux.local` / `abc4321`)

Import the live Shopify catalog (products, variants, photos, collections, pages):

```bash
npm run import:shopify
```

Stripe test keys go in `backend-server/.env`. See [docs/stripe.md](docs/stripe.md). Hosting beside LEVO: [docs/vps.md](docs/vps.md).
