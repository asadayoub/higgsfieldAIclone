# T09 — Results, History, and Asset Library

Status: **Draft plan — refine before implementation**

## Objective

Turn completed generations into durable, inspectable assets with clear privacy, provenance, and reuse actions.

## Dependencies

- T04 persistence/storage policies.
- T08 completed job contract.

## Planned deliverables

- Result route with media stage, configuration snapshot, provider provenance, retry/recreate, download, favorite, and publication controls.
- Persistent history with status/media filters, search, sorting, skeletons, pagination, and empty states.
- Signed private media delivery and explicit public publication flow.
- Failed/expired preview recovery.

## Acceptance criteria

- A completed result appears in history without manual save.
- Private assets cannot be fetched anonymously or by another user.
- Download filenames are meaningful and content types correct.
- Recreate from history preserves the original configuration while creating a new job.
- Publication requires explicit confirmation and never exposes private references.

## Verification

- Ownership and signed-access tests.
- History merge/filter/pagination tests.
- End-to-end generate → result → reload → history → recreate journey.

## Live-reference checks

- Validate result action hierarchy, asset empty state, density controls, and history loading patterns.

