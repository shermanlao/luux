# Customer accounts

`/account` signs a customer in with email and password, or with Google or Facebook. The session cookie is `luux_customer_session`, separate from the staff cookie. It lasts 7 days, so a refresh or a later visit to `/account` opens Orders instead of the sign-in form.

The same form also accepts a staff email and password from `admin_users`. A match sets `luux_admin_session` and the browser opens `/admin`, or the staff path kept in `next` when an unsigned visit to `/admin` was sent here. That cookie lasts 7 days. Opening `/account` again, or the account icon in the shop header, uses the staff cookie and opens `/admin` instead of the sign-in form. A wrong staff password can still sign in a customer who uses that email. Google and Facebook stay customer-only. `/admin/login` redirects to this page.

## Create account

The create-account form asks for the password twice. `password` and `password_confirm` must match, and the password must be at least 6 characters. A matching email that already exists is rejected.

## Google and Facebook

On the sign-in form, Google (`helpKey` `account.google`) and Facebook (`account.facebook`) sit above Sign in. They open:

- `GET /api/account/oauth/google`
- `GET /api/account/oauth/facebook`

Keys live in `backend-server/.env`:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

Each provider app needs this redirect URI, using `SITE_ORIGIN`:

- `{SITE_ORIGIN}/api/account/oauth/google/callback`
- `{SITE_ORIGIN}/api/account/oauth/facebook/callback`

Locally that is `http://localhost:3000/api/account/oauth/google/callback` and the same path for Facebook. On the live site, `SITE_ORIGIN` is `https://luuxmart.com`.

Google must return a verified email. Facebook must share an email. A new email creates a customer row (`google_sub` or `facebook_id` on `customers`). An email that already has a password signs into that same customer. Without the keys, the button returns to `/account` and shows that sign-in is not configured.

## Personal details

A signed-in visit to `/account` shows Personal details above Orders. The form saves a first name, last name, contact number, invoice address, and shipping address (`PATCH /api/account/profile`, button `account.save`). The invoice address is the billing address. Company, apartment, region, postal code, and phone are optional. A started address still needs a name, address line, city, and country. A phone, when entered, needs at least 6 digits. Shipping uses the invoice address unless Shipping address is the same as the invoice address (`account.same_address`) is unchecked. Checkout fills empty fields from this profile, and a signed-in payment writes the checkout details back onto the customer. Email stays the sign-in address.

## Orders

The orders table links each row to `/account/orders/[number]` (`account.order.open`). That page shows the date, a plain status (Payment pending, Paid, preparing to ship, Shipped, or Cancelled), each lamp, the invoice and shipping addresses, and the HKD totals. When staff have saved a carrier and tracking number, the page shows them. A tracking link opens with Track shipment (`account.tracking`).

The thank-you page links a signed-in customer to that order (`checkout.view_order`). A guest looks the order up with its number and the checkout email (`account.track`, `POST /api/account/orders/lookup`). The same form is on `/account` before sign-in, and on the order page when that order is not on the signed-in account. A wrong pair returns “Order not found” either way. The order number alone is not enough.
