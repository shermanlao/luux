# Stripe

Card data never touches this server. Checkout creates a Stripe Checkout Session. The webhook marks the order paid and reduces stock only when Stripe reports the session as paid. Cancelling a paid order puts that stock back. A failed Checkout Session leaves the order cancelled.

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

Use **live** keys on the VPS. `SITE_ORIGIN` must be `https://luuxmart.com` so Stripe return URLs and the login cookie stay on HTTPS. Nginx sends `/api/stripe/webhook` to the Express process (see [vps.md](vps.md)). The live endpoint is:

`https://luuxmart.com/api/stripe/webhook`

Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`. The shop ignores a completed session until `payment_status` is `paid`.

Prices are HKD with two decimal places (`unit_amount` in cents). Refunds are done in the Stripe dashboard.

Staff can charge about US$1 without listing a lamp: the unpublished product `payment-test` has **Pay US$1 test** in the admin editor. That checkout uses the hidden `paytest` shipping rate (HK$0, country `ZZ`), which the public shipping list does not return.

`/checkout/success` clears the cart once, then polls the order up to five times. Home (`nav.home`) and Account (`nav.account`) leave that page. The cart clear does not start a new render when the cart is already empty, so those links stay clickable while the page waits for the webhook.
