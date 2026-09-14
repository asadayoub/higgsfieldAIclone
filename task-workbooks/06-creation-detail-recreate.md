# T06 — Creation Detail and Recreate Journey

Status: **Draft plan — refine before implementation**

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

## Acceptance criteria

- Direct URLs render complete metadata and correct social metadata.
- Modal open/close preserves focus and browser history.
- Recreate prefills every supported setting and gracefully maps retired options.
- Touch and keyboard users receive all essential actions.

## Verification

- Route and serialization tests.
- Modal focus-trap and escape-key tests.
- Browser tests for open → recreate → back navigation.

## Live-reference checks

- Validate prompt presentation, action placement, and detail-to-studio transition against current production behavior.

