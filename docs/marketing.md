# Marketing

Staff open `/admin/marketing` to read the last 30 days and draft posts. **Ask AI** uses the AI base URL, key, and model saved on Integrations. A blank model sends `grok-4.7` when the base URL is `api.x.ai`, and `gpt-4o-mini` otherwise. **Confirm and post** is the only action that publishes. Nothing posts on its own.

The same campaign document is what another app receives from the HTTP API.

## Campaign document

```json
{
  "app": "luux",
  "analysis": { "summary": "", "findings": [] },
  "campaigns": [
    {
      "id": 1,
      "status": "draft",
      "caption": "",
      "image_url": "",
      "link": "",
      "channels": ["facebook", "instagram", "threads", "pinterest"],
      "rationale": "",
      "results": []
    }
  ]
}
```

`status` is `draft`, `posted`, or `failed`. Each result is `{ "channel", "status": "posted" | "failed", "external_id", "error" }`. Secrets are never inside the document.

## Traffic

A storefront beacon posts the path to `POST /api/traffic` when a normal browser opens a shop page. Counts live in `page_views` (`app`, `path`, `day`, `count`, `seconds`, `stays`). The server reads the visitor address only to name the country, then discards it. Country totals live in `traffic_countries`. The same request can include a source label: Direct, Google, Instagram, Facebook, Threads, Pinterest, Bing, Yahoo, or Other. Those totals live in `traffic_sources`. When the visitor leaves the page, a second request adds how many seconds it stayed open, up to 30 minutes.

Each new page view is also labeled Human, AI, or Web scraping. The label comes from the browser name on the request. That name is not stored. Totals live in `traffic_kinds`. Human is a normal browser. AI is a known assistant or model crawler, such as GPTBot, ClaudeBot, PerplexityBot, Google-Extended, or Bytespider. Web scraping is other automated fetching, including search crawlers such as Googlebot and Bingbot, scripts such as curl, and headless browsers. A shop page requested by one of those clients is counted from the server, because those clients usually do not run the beacon. Country, source, and time on a page count browsers only. The page-view total and the top-pages table include all three. Who visited is a bar chart of those three counts. AI crawlers and web scrapers do not add to the cart and do not pay, so the visitors chart counts Human only. A script that presents itself as Chrome is counted as Human. Views recorded before this change have no visitor type, so the three rows can add up to less than page views, and those older views are absent from the visitors chart.

There is no IP in those tables. A link with `utm_source` uses that label. A click from LUUX to another LUUX page does not add a source. Admin paths are skipped. Paid and fulfilled orders are summed by day for the LUUX overview. Staff see browser visits as a chart on Marketing. The chart spans the content width and stays 240 pixels tall, so a wide window does not stretch it. Time range (`admin.marketing.range`) is 7 days, 30 days, 90 days, or 12 months. Twelve months adds the days in each month. The other shop-wide totals on that page stay on the last 30 days. Views recorded before the country change have no country, source, or stay time. The draft sent to the model includes `visitor_kinds` for this shop. Other apps can omit it.

## Funnel

The funnel is a general function. The rules and the URL helper live in `backend-server/src/lib/shared/marketing-funnel.ts`. Luux supplies the shop name, HKD, product paths, and the order table in `backend-server/src/lib/shared/marketing-funnel-luux.ts` and `backend-server/src/lib/marketing/funnelLuux.ts`. See [Marketing funnel](marketing-funnel.md).

Staff see it on `/admin/marketing`, under the visitors chart. Time range (`admin.marketing.funnel_range`) is 7 days, 30 days, 90 days, or 12 months. The stages are drawn as a funnel that narrows from landings to product views, add to cart, checkout, and paid orders. The drawing spans the width beside the totals and stays 280 pixels tall. Paid revenue, conversion, and average order sit beside that shape. A table by campaign and a table by channel follow. Unattributed is its own row. A posted campaign card shows its own landings, orders, revenue, and conversion once any of those exist for the selected range. AI crawlers and web scrapers are not in the funnel.

Orders use the last non-direct click within 30 days. The browser keeps that click in a first-party cookie and in local storage (`luux_attr`) for 30 days. The store holds the campaign parameters and two timestamps. It does not hold a name, email, phone, address, or IP address. A direct return inside 30 days still credits that click. A visitor who only arrived direct, or who cleared the store, is unattributed. Orders from before this shipped stay in the shop-wide paid totals and show as unattributed in the funnel. Earlier page views stay in the shop-wide totals and are not assigned to a campaign.

Publish and **Copy tracked link** (`admin.marketing.copy_link`) add `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` when those are missing. A value already on the link is kept. For a post made in this shop the campaign is `luux-{id}` and the content is `{channel}-{external id or id}`. Medium for these posts is `organic_social`. Instagram and Threads have no separate link field, so the caption includes that tracked URL. Facebook and Pinterest use it as the link.

A normal browser sends `landing` on the first page of a visit, and `product_view` on `/products/{handle}`. Adding to the cart sends `add_to_cart`. Opening checkout with items in the cart sends `checkout_start` once per browser session. Paying an order sends `purchase` from the attribution saved on the order, not from the browser at webhook time. Pending and cancelled orders are ignored. Marking a paid order fulfilled does not count it again. Shop-wide paid totals still include every paid and fulfilled order.

Daily counts live in `funnel_events`. The order stores the same non-personal fields (`attr_source`, `attr_medium`, `attr_campaign`, `attr_content`, `attr_term`, `attr_channel`, `attr_landing_path`, `attr_campaign_id`, and the two timestamps). Stripe metadata receives those fields only. The marketing API does not return a customer name, email, phone, or address.

## Staff routes

Staff use the admin cookie. `app` defaults to `luux`.

| Method | Path | Use |
| --- | --- | --- |
| GET | `/api/marketing/v1/overview` | Views, visitor type, countries, sources, average stay, top paths, paid totals, a compact funnel for the last 30 days, connected channels, saved campaigns |
| GET | `/api/marketing/v1/visitors?range=30d` | Browser visits over time. AI and web scraping are omitted. `range` is `7d`, `30d`, `90d`, or `12m`. Days with no visits are zero. `12m` sums each month |
| GET | `/api/marketing/v1/funnel?range=30d&app=luux` | Funnel totals, by campaign, and by channel. A missing or unknown range uses 30 days |
| GET | `/api/marketing/v1/funnel/campaigns/:id?range=30d` | Funnel for one campaign, plus order number, amount, currency, and attribution |
| POST | `/api/marketing/v1/drafts` | Draft from shop data when `catalog` is omitted. A marketing key always uses shop data |
| PUT | `/api/marketing/v1/drafts/:id` | Edit caption, image, link, and channels while it is not posted |
| POST | `/api/marketing/v1/drafts/:id/publish` | Post the selected channels |
| POST | `/api/marketing/v1/keys` | Staff only. Returns a new marketing key once |

## Marketing key

Generate a key on `/admin/integrations`. It is shown once, then only the last four characters. An outside marketer sends it as `Authorization: Bearer <key>` to `https://luuxmart.com`. Call it from that app’s server. The browser CORS list is not widened.

The key reads this shop only. `app` defaults to `luux`. Another app name is refused. It cannot change products, prices, orders, inventory, Stripe, the AI key, or the social tokens. It does not return customer names, email, phone, addresses, or passwords.

| Method | Path | What the key does |
| --- | --- | --- |
| GET | `/api/marketing/v1/overview` | Last 30 days: views, visitor type, countries, sources, average stay, top paths, paid totals, a compact funnel, connected channels, saved campaigns |
| GET | `/api/marketing/v1/visitors?range=30d` | Browser visits for `7d`, `30d`, `90d`, or `12m`. AI and web scraping are omitted. A missing or unknown range uses 30 days |
| GET | `/api/marketing/v1/funnel?range=30d` | Funnel for this shop. Another app name is refused |
| GET | `/api/marketing/v1/funnel/campaigns/:id?range=30d` | Funnel for one LUUX campaign. Order rows omit contact details |
| GET | `/api/marketing/v1/drafts/:id` | One campaign document |
| POST | `/api/marketing/v1/drafts` | Draft from published products, traffic, and paid totals. An empty body is enough. Optional `channels` limits the draft to Facebook, Instagram, Threads, or Pinterest that already have tokens |
| PUT | `/api/marketing/v1/drafts/:id` | Edit caption, image, link, and channels while it is not posted |
| POST | `/api/marketing/v1/drafts/:id/publish` | Post the selected channels with the tokens saved on Integrations. A `tokens` object in the body is ignored |
| POST | `/api/marketing/v1/keys` | Staff session only. The marketing key cannot mint a new key |

Nothing is posted until publish. A channel that already posted is not posted again. A failed channel can be retried. A channel with no saved token comes back as `failed`, and the draft can still be exported as JSON.

```http
GET /api/marketing/v1/overview
Authorization: Bearer <marketing key>
```

```http
POST /api/marketing/v1/drafts
Authorization: Bearer <marketing key>
Content-Type: application/json

{}
```

A signed-in staff request may still send a catalog for another app name. That path is not available to the marketing key.

## Where to paste social tokens

On `/admin/integrations`, under Social posting. A blank token keeps the saved value.

- Facebook Page id and Page token. Open [Graph API Explorer](https://developers.facebook.com/tools/explorer/), run `GET me/accounts`, and copy the numeric Page id and that Page’s `access_token`. The token needs `pages_manage_posts`. The post goes to the Page feed.
- Instagram account id and token. In the same Explorer, run `GET {page id}?fields=instagram_business_account` and copy `instagram_business_account.id`. The Instagram account must be a professional account linked to that Page. The token needs `instagram_content_publish`; the Page token often works. The image must be a public `https` URL, so a draft can be saved locally and a live post needs `SITE_ORIGIN` to be the public site.
- Threads user id and token. In the Meta app, open Access the Threads API and generate a token with `threads_basic` and `threads_content_publish`. Call `GET https://graph.threads.net/v1.0/me?fields=id` with that token and paste the `id`. The post is text.
- Pinterest board id and token. On [developers.pinterest.com](https://developers.pinterest.com/), open the app and generate a token with `boards:read` and `pins:write`. Call `GET https://api.pinterest.com/v5/boards` with `Authorization: Bearer {token}` and paste the board `id`. The pin needs a public `https` image. A Trial app’s pins stay visible only to the token owner until Pinterest grants Standard access. Paste a new token when it expires.

`facebook_url`, `instagram_url`, `threads_url`, and `pinterest_url` on Settings are public profile links shown as icons in the shop footer. They are profile links, separate from these posting credentials. A channel without a token stays unchecked. The draft can still be copied or exported as JSON.
