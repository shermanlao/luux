# Marketing funnel

**GENERAL FUNCTION — Marketing Funnel.** The same rules can be copied into another shop. Luux is the first adapter. Staff open it at `/admin/marketing`.

The contract lives in `backend-server/src/lib/shared/marketing-funnel.ts`. It builds tracked URLs, reads UTM parameters, keeps the last non-direct click for 30 days, and assembles the report. It does not name a product path, a currency, or a brand. On the staff page the totals are drawn as a funnel that narrows from landing to paid order. AI crawlers and web scrapers are not recorded, because they do not place orders.

## What another app replaces

`backend-server/src/lib/shared/marketing-funnel-luux.ts` is the Luux adapter:

- App name `luux`
- Currency `HKD`
- A product page is `/products/{handle}`
- Checkout starts when `/checkout` is opened with items in the cart

`backend-server/src/lib/marketing/funnelLuux.ts` reads and writes Luux tables. The browser helper is `frontend/src/lib/funnel.ts`. Another app copies the shared module and writes a new adapter. It should keep the event names, the UTM fields, the 30-day last-non-direct rule, and the meaning of `GET /api/marketing/v1/funnel`.

## Events

`landing`, `product_view`, `add_to_cart`, `checkout_start`, and `purchase`.

`purchase` is recorded when an order first becomes paid. The amount comes from the attribution stored on the order. The report’s paid orders and revenue come from paid and fulfilled orders, so an order from before this shipped stays unattributed, and marking it fulfilled does not count it twice.

## Privacy

The attribution cookie and local storage hold campaign parameters and timestamps only. Funnel tables do not store an IP address. The marketing API can return an order number, amount, currency, and attribution. It does not return a name, email, phone, or address.

No third-party pixel is part of this function.
