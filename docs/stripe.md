# Stripe

Card data never touches this server. Checkout creates a Stripe Checkout Session; a webhook marks the order paid and reduces stock.

## Local

1. Create a Stripe account and get **test** keys.
2. Put them in `backend-server/.env`:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Forward webhooks while `npm run dev` is running:

```bash
stripe listen --forward-to localhost:3333/api/stripe/webhook
```

Paste the `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

4. Pay with Stripe test card `4242 4242 4242 4242`.

## Production

Use **live** keys on the VPS only. Nginx should send `/api/stripe/webhook` to the Express process (see [vps.md](vps.md)). After DNS points at the VPS, add the endpoint in Stripe:

`https://luuxmart.com/api/stripe/webhook`

Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`.

Prices are HKD with two decimal places (`unit_amount` in cents). Refunds are done in the Stripe dashboard.
