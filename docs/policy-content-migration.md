# Policy content migration

Storefront legal pages (`/policies/*` and CMS pages) read `pages.body_html` from the database.

## Boot migration

`ensureDefaultPages` in `backend-server/src/seed/defaults.ts` runs on every API boot after the database syncs. It applies idempotent HTML migrations and saves a page only when `body_html` changes.

| Handle | Helper | What it fixes |
| --- | --- | --- |
| `terms-of-service` | `migrateTermsPolicyHtml` | Duplicate overview blocks, Section 4 shipping wording, Shopify Section 9 and other Shopify leftovers, legacy `info@4techhk.com` |
| `refund-policy` | `migrateRefundPolicyHtml` | Back-to-back duplicate 30-day policy text, empty `mailto:info@4techhk.com` links, legacy email |
| `privacy-policy` | `migratePrivacyPolicyHtml` | “Powered by Shopify”, Relationship section, Shopify ad/disclosure examples, GPC account wording |
| `about-us`, `contact`, `cookie-policy`, `shipping-policy` | `replaceLegacyContactEmail` | Legacy `info@4techhk.com` only |

Implementation lives in:

- `backend-server/src/lib/shared/policyContentMigration.ts` — refund, privacy, email cleanup, and Shopify removal from Terms
- `backend-server/src/lib/shared/termsPolicy.ts` — terms duplicate collapse and Section 4 (composes the Shopify cleanup)
- `backend-server/src/lib/shared/htmlPolicyUtils.ts` — shared duplicate collapse and tag closing

Refund dedupe finds a second `We have a 30-day return policy` and cuts before that paragraph’s opening `<p>`, then closes unclosed tags (same approach as terms overview dedupe).

Tests use raw production HTML fixtures under `backend-server/test-fixtures/live-policy-html/` (2026-11-25 snapshots).

## Staff edits

Staff can still edit policies in **Admin → Pages**. Avoid pasting full legacy Shopify policy HTML more than once; boot migrations clean known leftovers on the next deploy.