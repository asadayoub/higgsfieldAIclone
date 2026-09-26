# T05.1 — Live Public Showcase and Dimensional Landing Page

Status: **Implementation complete — manual browser QA remaining**

## Objective

Turn the signed-out landing page into a credible creative-generation product surface: a fast dimensional hero that communicates image and motion creation, followed by a living public showcase containing every asset its owner explicitly chose to list.

## Current-state findings

- The landing hero is one static raster cover with copy layered over it.
- Explore renders 16 authored catalog records from `src/content/creations.ts`.
- The current multi-column layout uses CSS columns, so it reads as masonry rather than a deliberate bento composition.
- Published user assets receive a public copy and `/share/[slug]` route, but they are not included in Explore.
- The current publication promise is link sharing and explicitly says prompt and private recipe details are not shared. Existing link-shared work must not silently become discoverable.
- Publication, private assets, jobs, profiles, and storage are server-owned. A showcase endpoint must emit a narrow safe DTO and never expose private paths, owner IDs, prompts, references, provider errors, or credentials.

## Product decisions

### Public visibility

- Keep `public link` and `listed in Explore` as separate, explicit states.
- Every showcase card represents either an authored editorial study or an owner-approved showcase listing.
- Existing public links remain unlisted until their owners opt in. This preserves the promise under which they were published.
- The publication dialog gains a clear `List this in Explore` choice plus editable public title, category, and alt text.
- Prompt and full recipe remain private by default. A separate future consent can expose a reusable recipe; this task does not infer that permission.
- Revoked, unlisted, missing, failed, or administratively hidden assets disappear from the feed without deleting the owner's private source.

### Hero direction

- Replace the static cover with a split hero: product promise and actions on the left, a `Generation Core` 3D scene on the right.
- The scene is an original, code-authored visual: a refractive central lens/prism, orbiting image and motion frames, a scan ring, restrained particles, and cobalt/acid-green light accents. It should visually explain one prompt becoming multiple media outputs.
- Pointer movement adds shallow parallax; scroll transitions the media planes from scattered inputs into a composed output frame.
- The primary CTA remains normal HTML above the canvas. The 3D scene is decorative and never owns navigation or essential information.
- Prefer procedural geometry over a downloaded stock model. This avoids licensing ambiguity, reduces asset weight, and makes the visual native to the product.
- If procedural quality is insufficient, add one original compressed GLB under `public/media/hero/` with a strict size budget and a checked-in attribution/license note.

### Performance and fallback policy

- Keep `page.tsx` and all hero copy server-rendered.
- Mount WebGL as an isolated client component loaded dynamically from a client wrapper.
- Serve a purpose-built AVIF/WebP poster immediately; use it permanently on reduced-motion, save-data, unsupported-WebGL, and low-capability paths.
- Cap device pixel ratio, geometry count, texture resolution, and animation rate. Pause rendering when the hero is outside the viewport or the tab is hidden.
- Do not add physics, post-processing, runtime video textures, or a large 3D utility package in the first pass.
- Target budgets: poster at or below 180 KB, optional GLB at or below 350 KB, 3D client chunk at or below 220 KB gzip where practical, and no regression that makes the 3D scene the mobile LCP.

### Bento showcase

- Replace CSS columns with CSS Grid and explicit span recipes.
- Desktop uses a 12-column grid; tablet uses 6 columns; mobile uses one or two stable columns depending on width.
- A deterministic placement cycle creates large landscape anchors, tall portrait cards, square cards, and compact supporting cards. Layout never depends on random client state, preventing hydration shift.
- Media aspect ratio determines eligible spans, so portraits are not cropped into landscape anchors.
- The first server-rendered batch contains 12 entries. Subsequent batches use cursor pagination in groups of 12.
- An `IntersectionObserver` sentinel requests the next page near the viewport. A visible `Load more` button remains as keyboard, assistive-technology, and failure fallback.
- Images below the initial viewport use native/Next image lazy loading. Videos render posters with `preload="none"` and only request media when meaningfully visible or deliberately played.
- Appended cards use shaped skeletons and preserve scroll position. Exhaustion, empty filters, transient errors, and retry are explicit states.

## Public showcase data contract

Add an idempotent migration after `0005_huggingface_system_pool.sql`.

Proposed additive publication fields:

- `is_showcase_listed boolean not null default false`
- `public_title text`
- `public_category text`
- `public_alt_text text`
- `showcase_status text not null default 'visible'`
- `showcase_listed_at timestamptz`
- `showcase_updated_at timestamptz`

Constraints:

- Public title has a short bounded length.
- Category must come from the approved showcase taxonomy.
- Alt text is bounded and must not contain private paths or URLs.
- Only active, non-revoked, listed, visible publications backed by completed assets can enter the feed.
- Existing rows remain `is_showcase_listed = false`; there is no surprising backfill.

Indexes:

- A partial cursor index on `(showcase_listed_at desc, id desc)` for active listed rows.
- A category/media lookup index only if query plans justify it.

The browser never reads publication tables directly. A server-only query returns:

```ts
type ShowcaseItem = {
  id: string;
  slug: string;
  title: string;
  category: ShowcaseCategory;
  media: "image" | "video";
  publicUrl: string;
  alt: string;
  width: number | null;
  height: number | null;
  modelLabel: string | null;
  publishedAt: string;
  source: "editorial" | "community";
};
```

Explicitly excluded: owner UUID/email, private storage bucket/path, raw prompt, references, settings, credential IDs, provider request IDs, errors, quota data, and internal moderation notes.

## Query and pagination architecture

- The first page is fetched on the server so content exists in HTML for SEO, accessibility, and fast first paint.
- Add `GET /api/showcase` for later pages and filtered requests.
- Validate `cursor`, `type`, `category`, and `q` with Zod.
- Use stable keyset pagination with `showcase_listed_at + id`; never use unbounded offset pagination.
- Encode the cursor as an opaque versioned token and reject malformed or oversized values.
- Query only server-side with the Supabase admin client, then map records through a strict safe DTO.
- Return `items`, `nextCursor`, and `hasMore`; return no database-shaped objects.
- Cache anonymous successful responses briefly at the route/CDN boundary and revalidate after publish, unpublish, or moderation changes.
- Search only public title, approved category, public model label, and editorial metadata. Private prompts remain unsearchable.
- The authored catalog is merged through the same DTO and labelled `Editorial`; community listings sort newest-first beneath deliberately featured editorial anchors.

## Component plan

- `src/app/page.tsx`: server landing composition and first showcase page.
- `src/components/landing/generation-hero.tsx`: semantic hero copy, actions, fallback poster, and client-scene boundary.
- `src/components/landing/generation-scene-loader.tsx`: client-only dynamic import and capability/reduced-motion gating.
- `src/components/landing/generation-scene.tsx`: bounded Three Fiber scene.
- `src/components/discovery/showcase-feed.tsx`: filter state, pagination state, sentinel, retry, and accessible load-more control.
- `src/components/discovery/showcase-grid.tsx`: deterministic responsive bento placement.
- `src/components/discovery/showcase-card.tsx`: image/video card variants and public metadata.
- `src/components/discovery/showcase-skeleton.tsx`: bento-shaped loading placeholders.
- `src/server/showcase/service.ts`: safe public query and DTO mapping.
- `src/app/api/showcase/route.ts`: validated public read endpoint.
- `src/lib/showcase/contracts.ts`: DTO, filters, cursor, and taxonomy schemas.
- Existing `/creation/[slug]` continues to serve editorial studies; `/share/[slug]` serves community items.

## Interaction and visual specification

- Hero height: approximately 720–820 px on large screens, 620–700 px on tablet, content-led on mobile.
- Copy remains high contrast on a quiet left-side field; the 3D object occupies the right 55–60% without interfering with navigation.
- A small status rail communicates `Image · Video · Private by default` rather than decorative technical noise.
- Bento cards use edge-to-edge media, restrained metadata, and one primary action. Labels remain visible without hover.
- Hover adds depth, a subtle sheen, and video preview controls; keyboard focus produces the same information state.
- The existing green action color is used for focus, progress, and primary CTAs only, always paired with the dark action-ink token rather than white text.
- Filters remain URL-addressable and horizontally scrollable on mobile.

## Accessibility

- Decorative canvas is `aria-hidden`; all meaning and actions exist in HTML.
- Honor `prefers-reduced-motion`, Save-Data, keyboard navigation, and visible focus.
- No autoplay audio. Video cards are muted and user-controllable.
- Preserve logical DOM reading order even when CSS Grid changes visual spans.
- Alt text comes from explicit public metadata or a conservative media-type fallback, never from a private prompt.
- Infinite loading announces appended item count through a restrained live region without moving focus.
- Contrast target is WCAG AA for text and controls across hero and media overlays.

## Dependencies

- Add `three` and `@react-three/fiber` v9-compatible packages for React 19.
- Avoid `@react-three/drei` initially; add it only if a measured need outweighs its bundle cost.
- Use the existing `motion` package for DOM transitions, not canvas animation orchestration.

## Implementation sequence

1. Approve this workbook and add the additive publication migration.
2. Stop at the SQL checkpoint; provide the complete SQL, explanation, rollback switch, and read-only verification queries for manual Supabase execution.
3. Implement the safe public DTO, keyset query, API route, and contract tests.
4. Extend publication UI/actions with explicit showcase consent and public metadata validation.
5. Build the server-rendered first batch and accessible cursor loader.
6. Replace masonry with deterministic responsive bento layouts and new card states.
7. Create the static hero composition and final fallback poster.
8. Add the isolated procedural 3D scene, capability gates, pause behavior, and motion preferences.
9. Integrate editorial and community records, then complete empty/error/exhausted states.
10. Run automated checks only after migration confirmation, followed by user-performed browser QA.

## Automated verification

- Contract tests reject malformed cursors, invalid filters, and private-shaped fields.
- Pagination has no duplicates or omissions across equal timestamps.
- Revoked, hidden, unlisted, incomplete, and private assets never appear.
- Existing public links are not listed without explicit opt-in.
- Search never matches private prompt data.
- Bento placement is deterministic for each aspect/media class.
- Infinite loading deduplicates requests and survives retry.
- Reduced-motion and no-WebGL paths never import or mount the live scene.
- Full Vitest, TypeScript, ESLint, Prettier, and production webpack build pass.
- Bundle output and media sizes are recorded against the stated budgets.

## Manual browser QA — performed by the user

- Signed-out initial page and first batch.
- Opt-in publication, listing appearance, unlisting, and public-link continuity.
- Image and video cards, filters, search, and URL restoration.
- Slow-network skeleton, pagination retry, load-more fallback, and end-of-feed state.
- Refresh and back navigation after several loaded pages.
- 1440 px, 1024 px, 768 px, and 390 px layouts.
- Keyboard-only use, focus visibility, screen-reader labels, and reduced motion.
- WebGL-supported hero, forced fallback poster, hidden-tab pause, and mobile thermal behavior.
- Contrast verification, especially action-green surfaces.

## Rollback

- A server-side feature flag can keep the new public query and live 3D scene disabled independently.
- Disabling the live scene restores the poster without affecting the showcase.
- Disabling showcase listing returns Explore to the authored editorial catalog.
- Additive publication metadata remains intact; no public or private media must be deleted.

## Acceptance criteria

- Every explicitly listed active public asset is reachable in Explore through cursor pagination.
- No merely link-shared or private asset enters the showcase.
- The initial showcase batch is server-rendered; later batches load lazily without duplicates or layout jumps.
- The gallery reads clearly as a bento system at desktop and tablet sizes and remains coherent on mobile.
- The hero immediately communicates an image/video generation studio and has a polished non-WebGL fallback.
- The page remains usable with JavaScript delayed, WebGL unavailable, reduced motion enabled, and keyboard-only navigation.
- No sensitive generation or identity fields appear in page source or API responses.
- Performance, contrast, production build, and regression checks pass before completion is claimed.

## Database checkpoint

- Prepared `drizzle/0006_public_showcase.sql` with additive listing metadata, validation constraints, listing timestamps, a deterministic cursor index, a timestamp trigger, and explicit server-owned write permissions.
- Existing public-link publications remain unlisted because `is_showcase_listed` defaults to `false`; no existing row is backfilled into Explore.
- No Supabase command, dependency installation, formatter, test, type check, lint command, build, or application implementation has been run at this checkpoint.
- Waiting for the user to apply the migration manually in Supabase and confirm success before implementation continues.

## Completion record

- The user confirmed `drizzle/0006_public_showcase.sql` completed successfully in Supabase. No database browser control or automated migration command was used.
- Added the strict public DTO, opaque versioned cursors, stable editorial-to-community pagination, server-only Supabase mapping, bounded public search/filter inputs, and `/api/showcase` route with short anonymous cache headers.
- Existing editorial studies and explicitly listed community assets now share one paginated feed. Link-only, revoked, hidden, incomplete, invalid-storage, and non-generation assets are excluded.
- Added publication metadata validation and owner controls for public-link-only sharing, opt-in Explore listing, listing edits, unlisting, and full public revocation.
- Replaced the CSS-columns gallery with a deterministic responsive CSS Grid bento system, lazy community video attachment, loading/error/retry/end states, URL-backed filters, automatic intersection loading, and a visible load-more fallback.
- Replaced the static landing cover with server-rendered product messaging, a CSS fallback composition, and a dynamically imported procedural Three.js/React Three Fiber generation core. Reduced-motion, Save-Data, unsupported-WebGL, and offscreen states avoid mounting the canvas.
- Added independent `SHOWCASE_FEED_ENABLED` and `SHOWCASE_3D_ENABLED` server flags. Disabling either preserves data and restores the corresponding safe fallback.
- Installed `three`, `@react-three/fiber` 9.x, and `@types/three`. NPM reported the repository's pre-existing Node patch-version warning and four moderate transitive audit findings; no unsafe automatic audit fix was run.
- Focused showcase/publication/generation tests: 21 passed across 4 files.
- Full Vitest suite: 89 passed across 22 files.
- TypeScript, ESLint, and Prettier checks passed.
- Next.js 16.3.5 production webpack build passed with 34 generated routes, including `/api/showcase`.
- The dynamically loaded scene code plus its identified Three/Fiber vendor chunks total approximately 196 KB gzip, within the planned 220 KB practical target. The canvas is not part of the initial server-rendered hero content.

### Remaining verification

- User-performed browser QA for the 3D scene and fallback paths, publication/listing lifecycle, infinite loading against real listed rows, responsive bento geometry, keyboard flow, reduced motion, and contrast.
- T05.1 remains in progress until those manual checks are recorded; no browser automation was used for this task.
