# Admin

Staff routes under `/admin` require a signed-in session. Logins are rows in `admin_users` (SQLite locally, PostgreSQL in production). Customer accounts on `/account` are a separate cookie. See [Customer accounts](account.md).

## Sign in

1. Start `npm run dev` from the repo root.
2. Open http://localhost:3000/admin or the shop sign-in at http://localhost:3000/account.
3. First boot: email `hello@luuxmart.com` and password `j75gUyq2LwbspHL` (or `ADMIN_EMAIL` / `ADMIN_PASSWORD` if those were set when the users table was empty). Signing in on `/account` with that staff email opens `/admin`.

The session is an httpOnly cookie (`luux_admin_session`) signed with `ADMIN_SESSION_SECRET`. Next.js middleware blocks `/admin` except `/admin/login`.

Staff pages share a left panel (`AdminNav`) with Dashboard, Products, Collections, Pages, Settings, Integrations, Marketing, Shipping, Orders, and Inquiries. The current page is filled black. Sign-in stays a centered form without that panel.

## Pages

| Path | Use |
| --- | --- |
| `/admin` | Counts for products, orders, paid orders, inquiries |
| `/admin/products` | Each row shows the main photo beside the lamp name. Click the row to open the editor. Add product stays in the header. A search box and a collection menu sit to the left of Add product. All collections shows every lamp. Search matches the lamp name. Product, Price, and Variants sort the list. The first click is A–Z, lowest price, or fewest variants. The second click reverses that. Until a heading is clicked, the newest product stays first. |
| `/admin/products/[id]` | Title, supplier company, link, and contacts, HTML description, options, variants, stock, photos, collections. Each option is a name plus comma-separated values, with Delete on the row. Generate variants builds one row for every combination of the first three options and keeps price, SKU, and stock when that combination already exists. Each variant row has Delete. Link and contacts stay in the admin editor. Delete product is the top-right button and asks for confirmation. Add product (`/admin/products/new`) also has an AI assistant bar. |
| `/admin/collections` | Table of title, handle, product count, and a short description. Edit opens that row’s title, handle, and description. Description switches between HTML source (Current) and the rendered page (Display). |
| `/admin/pages` | Table of title, handle, and a short body. Edit opens that row’s title and HTML body, using the same Current / Display switch. About, Contact, privacy, cookie policy, refund, and terms. |
| `/admin/settings` | Homepage announcement, hero, featured handles, header logo, browser icon, contact, Facebook, Instagram, Threads, and Pinterest profile links, SEO, cookie notice |
| `/admin/integrations` | AI API base URL, key, and model. Stripe secret key, publishable key, and webhook secret. Facebook, Instagram, and Threads posting tokens. A marketing key for other apps, shown once. A blank secret keeps the saved value. The public site JSON does not include these. |
| `/admin/marketing` | Last 30 days of anonymous page views and paid orders. Ask AI drafts a campaign. Confirm and post publishes to the connected channels. Export JSON downloads the same campaign document. See [Marketing](marketing.md). |
| `/admin/shipping` | Hong Kong and worldwide flat rates (HKD) |
| `/admin/orders` | Paid Stripe orders; mark fulfilled or cancel. Cancelling a paid order returns the stock. Refunds stay in the Stripe Dashboard. |
| `/admin/inquiries` | Contact form messages |

Add product (`/admin/products/new`) shows an AI assistant bar above the form. Paste a public product link and choose Read product (`admin.product.import`). The server reads that page with the AI base URL, key, and model saved on Integrations. A blank model sends `grok-4.7` when the base URL is `api.x.ai`, and `gpt-4o-mini` otherwise. It then fills the title, handle, options, variants, and photos, and puts that link in the supplier Link field. The description is the same spec list used by the other lamps: Material, Colour, Finish, Dimmable, Light Source, Wattage, CCT, Lumin, Plug, Power Source, Shade, Switch, and Size, with `N/A` where the page does not say. Photos are saved under `uploads/products` and shown in the Photos row. Nothing is stored on the product until Save product, which then attaches those photos. Prices stay as the numbers on the source page so they can be corrected to HKD first. A link that is not public http or https is refused.

The product editor stores the supplier as Company (`vendor`), Link (`vendor_url`), and Contacts (`vendor_contact`). Company is included on the shop product JSON. Link and contacts are returned only to staff.

Product description, collection description, and page body share one Current / Display switch. Current is the HTML source. Display renders it with the shop prose styles. Settings text stays plain because those fields are not HTML.

Photos are added by dropping image files on the dashed Photos box. Each thumbnail can be deleted on its own. The photo marked Main is the one shown on product cards, the admin product list, and as the first photo when the shop page opens. Choosing Main on a saved photo calls `POST /api/admin/images/:id/main`, which stores that photo at position 1 and shifts the others. On a new product the choice stays on the form until Save product, which attaches the photos with the main one first. A saved photo is removed with `DELETE /api/admin/images/:id`. A photo that is not saved yet is only taken off the form. Clicking a thumbnail opens Edit photo with AI: preview, reset, the slot name, a short chat, an instruction, increase resolution, and a “Photo for reference only” bar drawn in the browser. Apply calls `POST /api/admin/products/images/edit`, which uses the Integrations key and `grok-imagine-image-2.0`, writes the result under `uploads/products`, and returns the new path. A saved photo keeps its place via `PUT /api/admin/images/:id`. A pending photo only swaps the path on the form.

Save product stays disabled while the save and photo attach are running. If the handle is already used, the API returns `A product with this handle already exists.` and the new-product form opens that lamp. Title, variant title, option name, SKU, and photo alt are stored up to 255 characters. A validation failure names the field instead of saying only “Validation error”.

Public buttons use `helpKey`. Tip text lives in `help_tips` and is upserted on API start.
