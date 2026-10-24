# Frontend UI

Shared tokens live in `frontend/src/app/globals.css`. Wrappers live in `frontend/src/components/ui/`.

- `.btn-primary` — black fill
- `.btn-secondary` — black border
- `.btn-danger` — red border
- `.input-field` / `.select-field`
- `.card-panel` / `.table-wrap` / `.empty-state` / `.spinner`
- `.option-tag` / `.option-tag-on` — variant chips
- Brand mint: `#7A9E8F` (`brand` in Tailwind)

`Button` requires `helpKey`. Tips are loaded from `/api/help-tips` and stored in `help_tips`. `HelpButton` / `HelpLink` apply `title` only after mount so the tooltip does not mismatch SSR HTML. When you add a control, add the `helpKey` and a row in `backend-server/src/seed/defaults.ts` (upserted on boot).

Product photos live in `ProductGallery`. The page always opens on the first gallery photo. Thumbnail clicks change the main photo. Changing a size or colour then jumps to that variant’s assigned photo when it has one. Prev/next arrows cycle the gallery (`product.gallery.prev`, `product.gallery.next`, `product.gallery.thumb`).
