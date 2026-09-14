# T07 — Generation Studio and Reference Inputs

Status: **Draft plan — refine before implementation**

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

## Live-reference checks

- Revalidate current image/video model pickers, ratio behavior, and compact settings density while implementing each control group.

