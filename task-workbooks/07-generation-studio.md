# T07 — Generation Studio and Reference Inputs

Status: **Planned — implementation in progress**

## Final plan

- One capability catalog controls supported media, ratios, reference count, quality, resolution, quantity, and duration. Guided studies remain available without credentials; live mode only offers the supported OpenAI and Replicate adapters.
- Recreate settings initialize editable controls. Unsupported or retired settings map to a compatible catalog default with an explicit notice.
- Image mode uses a wide preview stage and compact composer. Video mode uses a side-panel composer on desktop, with one-column mobile order.
- References accept JPEG, PNG, and WebP only, with signature checks, a 4 MB limit, 256–8192px dimensions, and model-specific count limits. Visitors keep references local. Signed-in users can explicitly upload to the private reference bucket; no public reference URL is returned.
- File previews are removed and reordered with labeled buttons, not pointer-only drag gestures. Object URLs are revoked on removal and unmount.
- Confirmation shows execution mode, provider/model, prompt, settings, reference count, privacy, and external-cost warning. T08 owns execution; T07 does not simulate a submitted generation.

## Affected files

- `src/content/studio-models.ts`: shared capability catalog.
- `src/lib/studio/validation.ts` and tests: configuration and reference validation.
- `src/components/studio/generation-studio.tsx`: editable responsive composer and confirmation.
- `src/components/studio/reference-input.tsx`: local preview, dimensions, ordering, and explicit private upload.
- `src/app/studio/page.tsx` and `actions.ts`: session-aware arrival and authorized upload action.
- `next.config.ts`: bounded server-action upload limit.

## Validation and rollback

- Run format, lint, typecheck, complete Vitest suite, production compilation, and browser tests for recreate editing, media switching, invalid files, settings, and confirmation at desktop/390px.
- No migration is required. Reverting these components restores the read-only recipe arrival page without affecting stored user assets.

## Reference notes

- The current public image studio redirects to a model-specific URL but gates its controls behind sign-in. The signed-in Chrome reference could not be attached reliably during this pass; use the existing recon captures for density and recheck live controls when browser access is restored.

## Objective

Create focused Image and Video workspaces that make model configuration powerful without overwhelming new users.

## Dependencies

- T02 controls and shell.
- T04 provider capability registry and private storage.
- T06 recreate payload.

## Planned deliverables

- Image bottom composer and video side-panel layouts.
- Mode switch, prompt, searchable model picker, preset picker, aspect ratio, quantity, quality, resolution, duration, and advanced options.
- Drag/drop and file-picker reference input with preview/remove/reorder.
- Capability-driven control visibility and validation.
- Guided/live mode indicator and final generation confirmation.

## Acceptance criteria

- Recreate state is visible and editable on arrival.
- Unsupported model/control combinations cannot be submitted.
- File type, size, count, and dimension errors are explained before upload.
- Private uploads use authenticated owner-scoped paths.
- Generate confirmation identifies mode, provider/model, settings, visibility, and potential external cost.

## Verification

- Schema and capability tests.
- Upload validation tests.
- Keyboard, drag/drop, mobile, and confirmation browser tests.

## Implementation checkpoint — 2026-09-15

- Editable Image and Video workspaces, searchable model picker, capability-limited settings, prompt validation, reference preview/reorder/remove, private-upload server action, and review/draft confirmation are implemented.
- Browser verification passed: catalog recreate initializes editable fields; changing prompt/ratio is reflected in confirmation; saving a reviewed draft gives success feedback; live mode blocks missing credentials; switching to Video changes duration, resolution, model choices, and reference limits; searching `kling` finds the compatible motion model; 10-second duration appears correctly in review.
- Format, lint, TypeScript, and all 10 Vitest suites / 35 tests pass. The supported webpack production build compiles and generates all 32 pages.
- No generation is submitted in this milestone. Review saves a local draft; T08 will attach the execution runner.

## Remaining verification gate

- The browser refused attaching the original public cover image through its file chooser. No file was uploaded and no reference-picker success is claimed.
- Recheck valid/invalid file selection, local previews, ordering/removal, private authenticated upload, and cross-account object denial once browser file access is available.
- Complete 390px/1024px visual QA and ensure file-picker state is clean before continuing browser work.
- T07 stays in progress until these checks pass; T08 has not started.

## Live-reference checks

- Revalidate current image/video model pickers, ratio behavior, and compact settings density while implementing each control group.
