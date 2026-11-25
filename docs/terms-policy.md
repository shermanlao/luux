# Terms policy migration

The storefront Terms of service page (`/policies/terms-of-service`) reads `pages.body_html` for handle `terms-of-service`.

## Boot migration

`ensureDefaultPages` in `backend-server/src/seed/defaults.ts` runs on every API boot after the database syncs. For terms it calls `migrateTermsPolicyHtml` in `backend-server/src/lib/shared/termsPolicy.ts`, which:

1. **Collapses duplicates** — finds repeated overview headers with the regex `OVERVIEW(?:\s|<[^>]+>)*Welcome to LUUX` (Shopify often wraps `OVERVIEW` in `<strong>` / `<br>` tags, so a plain-text substring match is not enough). Keeps everything before the **second** match (including the opening `<div class="rte">` wrapper), then closes any unclosed tags (`</strong>`, `</p>`, `</div>`, etc.).
2. **Updates Section 4** — replaces the old “posted prices do not include taxes, shipping…” sentence and earlier HK-shipping wording with the current HKD / standard HK included / remote quoted / overseas HK$280 text, using replace-all so no stale copy remains.
3. **Removes Shopify leftovers** — drops Section 9, “powered by Shopify” wording, hosted-by-Shopify privacy paragraphs, and other Shopify-only boilerplate while keeping placeholders such as `[INSERT TRADING NAME]` intact. Replaces legacy `info@4techhk.com` with `hello@luuxmart.com`.

Refund and privacy policies use sibling helpers documented in [Policy content migration](policy-content-migration.md).

The migration is idempotent: a single correct body is unchanged on later boots.

## Staff edits

Staff can still edit terms in **Admin → Pages**. Avoid pasting the full Shopify terms HTML more than once; duplicate pastes are removed on the next deploy, keeping only the first block.