# Stripe

Card data never touches this server. Checkout creates a Stripe Checkout Session only after the customer enters an email, a contact number, and an invoice address (first name, last name, address, city, and country; company is optional). Shipping uses that invoice address unless they uncheck “Shipping address is the same as the invoice address” and enter a delivery address. The shipping rate follows the delivery country. The API refuses the session when any of those are missing. A signed-in customer’s saved details fill checkout, and the payment writes them back to the account. The webhook marks the order paid and reduces stock only when Stripe reports the session as paid. The first time that happens, the shop emails `hello@luuxmart.com` with the order number, customer email, phone, items, totals, invoice address, and shipping address. A reply goes to the customer. `orders.staff_notice` stays empty until that mail is accepted, then it is `1`, so a later webhook does not send it again. While the send is in progress the column is `sending`. A second webhook during that minute does not send another copy; it answers 500 so Stripe can retry if the first send failed. The message uses the outgoing mail saved on Settings (Agentic Mail API, or SMTP when that token is blank). If that mail is not set up, the order still becomes paid and the notice is skipped. If the mail server rejects the message, `staff_notice` is cleared and the webhook answers 500 so Stripe retries it. Stock is reduced only once. Cancelling a paid order puts that stock back. A failed Checkout Session leaves the order cancelled. Staff mark a paid order shipped with a carrier and tracking number. The customer order page shows that tracking.

## Local

1. Create a Stripe account and get **test** keys.
2. Save them on http://localhost:3000/admin/integrations (secret key, publishable key, webhook secret). A blank field keeps the saved key. Checkout reads the database first and uses `backend-server/.env` only when that field is empty:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Forward webhooks while `npm run dev` is running:

```bash
stripe listen --forward-to localhost:3333/api/stripe/webhook
```

Paste the `whsec_...` value into Webhook secret on Integrations, or into `STRIPE_WEBHOOK_SECRET` when the database field is empty.

4. Pay with Stripe test card `4242 4242 4242 4242`.

## Production

Use **live** keys on the VPS. Save them at https://luuxmart.com/admin/integrations. They are stored in the VPS Postgres database. Deploy updates the code only, so keys saved on this computer stay there until they are saved again on the live site. `SITE_ORIGIN` must be `https://luuxmart.com` so Stripe return URLs and the login cookie stay on HTTPS. Nginx sends `/api/stripe/webhook` to the Express process (see [vps.md](vps.md)). The live endpoint is:

`https://luuxmart.com/api/stripe/webhook`

Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`. The shop ignores a completed session until `payment_status` is `paid`.

Prices are HKD with two decimal places (`unit_amount` in cents). Refunds are done in the Stripe dashboard.

Staff can charge about US$1 without listing a lamp: the unpublished product `payment-test` has **Pay US$1 test** in the admin editor. That checkout uses the hidden `paytest` shipping rate (HK$0, country `ZZ`), which the public shipping list does not return.

`/checkout/success` clears the cart once, then polls the order up to five times. Home (`nav.home`) and Account (`nav.account`) leave that page. The cart clear does not start a new render when the cart is already empty, so those links stay clickable while the page waits for the webhook.
