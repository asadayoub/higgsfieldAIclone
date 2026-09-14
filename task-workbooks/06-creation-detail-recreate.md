# T06 — Creation Detail and Recreate Journey

Status: **Complete — verified 2026-09-14**

## Objective

Let users inspect the creative recipe behind a piece and reproduce it without manually rebuilding settings.

## Dependencies

- T05 catalog and card navigation.
- T02 dialog/sheet and metadata primitives.

## Planned deliverables

- Shareable `/creation/[slug]` route.
- Desktop modal and mobile full-screen detail treatment.
- Media stage, prompt, model, preset, ratio, provenance, and related items.
- Recreate action that serializes validated configuration into studio state.
- Copy prompt, favorite, and safe share-link actions.

## Product decisions

- Every catalog creation has a canonical `/creation/[slug]` URL with build-time params and creation-specific metadata.
- Client-side navigation from Explore opens that same URL in an intercepted native-dialog overlay; a direct visit or refresh renders a complete page. This preserves gallery position, browser back/forward behavior, focus trapping, and shareability without duplicating the content contract.
- Mobile uses a full-viewport dialog sheet while desktop keeps the Explore context visible behind a large media workspace.
- Recreate URLs include a versioned, bounded recipe (`source`, `mode`, `model`, `preset`, `ratio`, and `prompt`). The source catalog remains authoritative when available, while a conservative parser supports retired-model aliases and rejects malformed inputs.
- Favorites are local and device-scoped in this task so they work for visitors. Authenticated database persistence and cross-device sync remain owned by T09.
- Copy actions use the Clipboard API with visible toast confirmation. Sharing exposes only the canonical public creation URL and never includes account or provider information.

## Reference findings — 2026-09-14

- The live reference exposes substantial prompt context directly beside community media and pairs it with a clear recreate action.
- Public project surfaces emphasize provenance, source assets, and the creative recipe rather than presenting media as an isolated image.
- LumaForge keeps that transparency but uses a quieter two-column recipe panel, explicit public-provenance language, and one dominant `Recreate in Studio` action.

## Implementation map

- `src/app/creation/[slug]/page.tsx`: canonical page, static params, dynamic metadata, and invalid-slug handling.
- `src/app/@modal/*`: intercepted creation route plus catch-all/default null states.
- `src/app/layout.tsx`: root modal slot.
- `src/components/creation/creation-detail.tsx`: reusable media, recipe, provenance, actions, and related work.
- `src/components/creation/creation-modal.tsx`: native dialog lifecycle and history close.
- `src/components/creation/creation-actions.tsx`: copy, share, local favorite, and recreate controls.
- `src/lib/discovery/creation-recipe.ts`: versioned serializer, parser, validation, and retired option mapping.
- `src/app/studio/page.tsx`: a visible, read-only arrival summary until T07 turns the recipe into editable controls.
- Catalog card links move from studio placeholders to canonical creation URLs.

## Validation commands

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build` (or supported webpack builder if the sandbox prevents Turbopack's internal worker port)
- Browser QA: Explore → modal → close/back → forward; copy prompt; favorite persistence; direct detail URL; recreate payload; unknown slug; 390px full-screen treatment.

## Rollback notes

- The route is backed entirely by the static public catalog and requires no migration.
- Remove the `@modal` slot and restore catalog card links to `/studio?source=...` to roll back interception independently of the canonical detail route.

## Acceptance criteria

- Direct URLs render complete metadata and correct social metadata.
- Modal open/close preserves focus and browser history.
- Recreate prefills every supported setting and gracefully maps retired options.
- Touch and keyboard users receive all essential actions.

## Verification

- Route and serialization tests.
- Modal focus-trap and escape-key tests.
- Browser tests for open → recreate → back navigation.

## Verification result

- Formatting, ESLint, and TypeScript checks pass.
- Vitest now executes both top-level and colocated suites: all 9 files and 30 tests pass. Four recipe tests cover catalog authority, full round-trip, retired-model mapping, and malformed input rejection.
- The supported webpack production builder compiles successfully, type-checks, and generates 32 pages, including all 15 canonical creation detail paths.
- Desktop browser QA confirmed a client-side catalog click preserves Explore behind an open native dialog, updates the URL to `/creation/fabric-orbit`, and moves focus inside the modal.
- Close button and Escape both return to Explore at the preserved 938px scroll position; browser forward reopens the modal with the same creation.
- Prompt copy exposes visible success feedback. Visitor favorite state changes its accessible label and persists when the modal is reopened.
- Recreate navigates out of the modal to Studio with version, source, mode, prompt, model, preset, and ratio intact. Studio visibly resolves the authoritative catalog recipe.
- A hard visit to `/creation/monolith-tide` renders the full page without a dialog and exposes the correct document title, canonical URL, and Open Graph media. An unknown slug renders the product 404.
- 390 × 844 QA confirmed a full-viewport modal, large stable media, visible close control, readable recipe panel, and compact persistent actions. The temporary viewport override was reset afterward.

## Live-reference checks

- Validate prompt presentation, action placement, and detail-to-studio transition against current production behavior.
