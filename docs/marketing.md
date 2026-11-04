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

A storefront beacon posts the path to `POST /api/traffic`. Counts live in `page_views` (`app`, `path`, `day`, `count`). The same request can include a source label: Direct, Google, Instagram, Facebook, Threads, Pinterest, Bing, Yahoo, or Other. Those totals live in `traffic_sources`. A second beacon sends how many seconds the page stayed open, up to 30 minutes, and Marketing shows the average. There is no new cookie and no IP in those tables. A link with `utm_source` uses that label. A click from LUUX to another LUUX page does not add a source. Admin paths are skipped. Paid and fulfilled orders are summed by day for the LUUX overview. Views recorded before this change have no source and no stay time.

## Staff routes

Staff use the admin cookie. `app` defaults to `luux`.

| Method | Path | Use |
| --- | --- | --- |
| GET | `/api/marketing/v1/overview` | Views, sources, average stay, top paths, paid totals, connected channels, saved campaigns |
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
