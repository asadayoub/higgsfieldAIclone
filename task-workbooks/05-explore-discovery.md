# T05 — Explore and Discovery Experience

Status: **Complete — verified 2026-09-14**

## Objective

Build a fast, cinematic discovery surface that turns original showcase media into clear entry points for recreation.

## Dependencies

- T01 media asset kit and catalog types.
- T02 responsive shell and UI primitives.

## Planned deliverables

- Editorial hero, masonry gallery, media/category chips, and search.
- URL-synchronized filters and predictable back/forward behavior.
- Hover/focus actions, media metadata, skeletons, empty results, and retry states.
- Responsive image sizing and intentional loading priorities.

## Product decisions

- Explore is the signed-out home surface rather than a separate marketing page. The first viewport establishes the product promise and immediately exposes real work to inspect.
- The gallery uses the original LumaForge asset system only. It borrows the reference product's media-first hierarchy and direct recreate affordance, not its branding, copy, or layouts.
- Search and filters are client-side over a curated public catalog so the first release remains instant, resilient, and free to host. The catalog contract can later be backed by published database assets without replacing the UI.
- `type`, `category`, and `q` are canonical URL parameters. Defaults are omitted, invalid values resolve to defaults, and every user change uses navigation so browser history remains meaningful.
- Essential card actions remain visible on touch and keyboard. Pointer hover only adds supporting prompt context.
- Video entries use authored poster art and are explicitly labeled as motion studies; playback arrives with the creation-detail journey rather than pretending static assets are playable video.

## Reference findings — 2026-09-14

- The live product now behaves as an editorial product index: compact global navigation, large media-led feature tiles, repeated gallery rails, and an immediate action on every media item.
- Community cards expose substantial prompt context while a nearby `Recreate` action carries intent forward.
- Sections are grouped by a creative capability or model instead of presenting a single undifferentiated stream.
- LumaForge will condense those ideas into one searchable masonry surface because it provides a clearer first-run path for this product's narrower scope.

## Implementation map

- `src/content/creations.ts`: typed, immutable discovery catalog.
- `src/lib/discovery/filter-creations.ts`: normalization and composed search/filter behavior.
- `src/components/discovery/explore-gallery.tsx`: URL synchronization, controls, result count, empty/reset behavior.
- `src/components/discovery/creation-card.tsx`: stable media geometry, keyboard/touch actions, metadata, motion labeling.
- `src/components/discovery/explore-skeleton.tsx`: route-aligned loading geometry.
- `src/app/page.tsx` and `src/app/loading.tsx`: editorial entry surface and resilient loading state.
- `src/lib/discovery/filter-creations.test.ts`: search, filter composition, and normalization coverage.

## Validation commands

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- Browser smoke checks for search, composed filters, copied URL, back/forward restoration, keyboard focus, empty reset, and 390px layout.

## Rollback notes

- The discovery catalog and UI are isolated from authenticated data and can be reverted without a migration.
- Existing media files are reused unchanged; rollback only removes the catalog, discovery components, tests, and home-page integration.

## Acceptance criteria

- Search covers title, prompt, author label, category, model, and preset.
- Filters compose correctly and are shareable by URL.
- Cards are keyboard-openable and do not hide essential actions from touch users.
- Largest contentful media is optimized and the page remains stable while loading.

## Verification

- Filter/search unit tests and Playwright navigation tests.
- Visual screenshots at target widths.
- Network audit for oversized or eagerly loaded media.

## Verification result

- `npm run format:check`, `npm run lint`, and `npm run typecheck` pass.
- `npm test` passes all 7 files and 22 tests, including four discovery-specific cases.
- Next production compilation completes with the supported webpack builder: 17 static/dynamic routes generated. The default Turbopack runner cannot bind its internal CSS worker port in the execution sandbox; no source diagnostic is produced, and webpack compilation plus TypeScript both pass.
- Desktop browser QA confirmed the editorial hero, four-column media surface, readable hover recipe, stable aspect ratios, and visible card actions.
- Live interaction QA confirmed `Noor Objects` returns three assets; `soft + video + fashion` produces only `Veil in Motion`; the URL serializes all three filters; back navigation removes the last filter and restores the correct pressed states.
- Empty-result QA confirmed a clear explanation and one-action recovery to all 15 creations.
- 390 × 844 browser QA confirmed the compact header, legible hero, single-column cards, horizontally scrollable filter row, and persistent touch-accessible `Recreate` action. The temporary viewport override was reset afterward.
- The only browser console warning was a hydration attribute injected by an installed Chrome keyboard-shortcut extension; application markup and behavior were unaffected.

## Live-reference checks

- Revisit card density, hover actions, skeleton geometry, and mobile discovery behavior before final styling.
