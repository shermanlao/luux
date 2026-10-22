# Admin

Staff routes under `/admin` require a signed-in session. Logins are rows in `admin_users` (SQLite locally, PostgreSQL in production). Customer accounts on `/account` are a separate cookie.

## Sign in

1. Start `npm run dev` from the repo root.
2. Open http://localhost:3000/admin
3. First boot: email `admin@luux.local` and password `abc4321` (or `ADMIN_EMAIL` / `ADMIN_PASSWORD` if those were set when the users table was empty).

The session is an httpOnly cookie (`luux_admin_session`) signed with `ADMIN_SESSION_SECRET`. Next.js middleware blocks `/admin` except `/admin/login`.

## Pages

| Path | Use |
| --- | --- |
| `/admin` | Counts for products, orders, paid orders, inquiries |
| `/admin/products` | List, add, edit, delete lamps |
| `/admin/products/[id]` | Title, HTML description, options, variants, stock, photos, collections |
| `/admin/collections` | Pendant, Wall, Table, Floor, Ceiling |
| `/admin/pages` | About, Contact, privacy, refund, terms |
| `/admin/settings` | Homepage hero, featured handles, contact, social, SEO |
| `/admin/shipping` | Hong Kong and worldwide flat rates (HKD) |
| `/admin/orders` | Paid Stripe orders; mark fulfilled or cancel |
| `/admin/inquiries` | Contact form messages |

Public buttons use `helpKey`. Tip text lives in `help_tips` and is upserted on API start.
