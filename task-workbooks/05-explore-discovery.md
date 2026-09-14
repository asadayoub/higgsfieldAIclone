# T05 — Explore and Discovery Experience

Status: **Draft plan — refine before implementation**

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

## Acceptance criteria

- Search covers title, prompt, author label, category, model, and preset.
- Filters compose correctly and are shareable by URL.
- Cards are keyboard-openable and do not hide essential actions from touch users.
- Largest contentful media is optimized and the page remains stable while loading.

## Verification

- Filter/search unit tests and Playwright navigation tests.
- Visual screenshots at target widths.
- Network audit for oversized or eagerly loaded media.

## Live-reference checks

- Revisit card density, hover actions, skeleton geometry, and mobile discovery behavior before final styling.
