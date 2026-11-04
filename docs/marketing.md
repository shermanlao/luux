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
      "channels": ["facebook", "instagram", "threads"],
      "rationale": "",
      "results": []
    }
  ]
}
```

`status` is `draft`, `posted`, or `failed`. Each result is `{ "channel", "status": "posted" | "failed", "external_id", "error" }`. Secrets are never inside the document.

## Traffic

A storefront beacon posts the path to `POST /api/traffic` when a normal browser opens a shop page. Counts live in `page_views` (`app`, `path`, `day`, `count`, `seconds`, `stays`). The server reads the visitor address only to name the country, then discards it. Country totals live in `traffic_countries`. The same request can include a source label: Direct, Google, Instagram, Facebook, Threads, Pinterest, Bing, Yahoo, or Other. Those totals live in `traffic_sources`. When the visitor leaves the page, a second request adds how many seconds it stayed open, up to 30 minutes.

Each new page view is also labeled Human, AI, or Web scraping. The label comes from the browser name on the request. That name is not stored. Totals live in `traffic_kinds`. Human is a normal browser. AI is a known assistant or model crawler, such as GPTBot, ClaudeBot, PerplexityBot, Google-Extended, or Bytespider. Web scraping is other automated fetching, including search crawlers such as Googlebot and Bingbot, scripts such as curl, and headless browsers. A shop page requested by one of those clients is counted from the server, because those clients usually do not run the beacon. Country, source, and time on a page count browsers only. Page views, top pages, and the daily view column include all three. A script that presents itself as Chrome is counted as Human. Views recorded before this change have no visitor type, so the three rows can add up to less than page views.

There is no new cookie and no IP in those tables. A link with `utm_source` uses that label. A click from LUUX to another LUUX page does not add a source. Admin paths are skipped. Paid and fulfilled orders are summed by day for the LUUX overview. Views recorded before the country change have no country, source, or stay time. The draft sent to the model includes `visitor_kinds` for this shop. Other apps can omit it.

## Staff routes

Staff use the admin cookie. `app` defaults to `luux`.

| Method | Path | Use |
| --- | --- | --- |
| GET | `/api/marketing/v1/overview` | Views, visitor type, countries, sources, average stay, top paths, paid totals, connected channels, saved campaigns |
| POST | `/api/marketing/v1/drafts` | Draft from shop data when `catalog` is omitted |
| PUT | `/api/marketing/v1/drafts/:id` | Edit caption, image, link, and channels while it is not posted |
| POST | `/api/marketing/v1/drafts/:id/publish` | Post the selected channels |
| POST | `/api/marketing/v1/keys` | Staff only. Returns a new marketing key once |

## Other apps

Generate a marketing key on Integrations. It is shown once, then only the last four characters. Send it as `Authorization: Bearer <key>`.

`POST /api/marketing/v1/drafts` with a catalog. This shop’s saved AI key writes the draft.

```json
{
  "app": "other-shop",
  "catalog": [{ "title": "", "url": "", "image": "", "price": "" }],
  "page_views": [{ "day": "2026-11-01", "path": "/", "count": 12 }],
  "orders": [{ "day": "2026-11-01", "total": "80.00", "count": 1 }],
  "channels": ["facebook", "threads"]
}
```

Other apps keep their own channel tokens and send them only on publish:

`POST /api/marketing/v1/drafts/:id/publish`

```json
{
  "tokens": {
    "facebook_page_id": "",
    "facebook_page_token": "",
    "instagram_account_id": "",
    "instagram_token": "",
    "threads_user_id": "",
    "threads_token": ""
  }
}
```

LUUX ignores that body and uses the tokens saved on Integrations. A channel that already posted is not posted again. A failed channel can be retried.

The browser CORS list is not widened. Call the API from the other app’s server.

## Where to paste Meta tokens

On `/admin/integrations`, under Social posting:

- Facebook: Page id and Page token. The post goes to the Page feed.
- Instagram: Instagram account id and token. The image must be a public `https` URL, so a draft can be saved locally and a live post needs `SITE_ORIGIN` to be the public site.
- Threads: Threads user id and token. The post is text.

`facebook_url`, `instagram_url`, and `threads_url` on Settings are public profile links. They are not posting credentials. A channel without a token stays unchecked. The draft can still be copied or exported as JSON.
