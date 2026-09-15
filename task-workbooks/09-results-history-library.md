# T09 — Results, History, and Asset Library

Status: **Complete — browser guided journey and mocked private workflows verified**

## Final implementation plan

- Add bounded visitor guided history (latest 50 runs), local favorites, result inspection, download, and recipe reuse. Keep browser-only history distinct from cloud records; never merge private cloud records into localStorage.
- Authenticated history/library use owner-scoped job/asset DTOs and expiring private signed media URLs. Include search, status/media/favorite filters, pagination, provenance, recovery messaging, recipe reuse and explicit retry confirmation.
- Dedicated result routes read local guided or owner-only live records. Public sharing copies only a selected completed output to showcase-public after confirmation; references and private paths are never included. Revocation disables the share and removes the public copy, but cannot retract downloaded media.
- Affected files: local history store/filter tests, history/library/result/share pages, result actions, generation read/publication service, shared runner/result UI. No destructive changes to existing assets.
- Verify generate → result → history → reopen → recreate, filters/pagination, favorite persistence, signed access boundaries, publication ownership, anonymous share reads, failure/empty states, and full format/lint/type/test/build checks. No live API tests.
- Rollback pages/actions/store additions; already persisted jobs and assets remain available in Supabase.

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

## Implementation and verification — 2026-09-15

- Result routes distinguish browser-local authored studies from private live AI records. Guided results include downloads, recipe inspection/reuse, favorites, progress, and cancellation. Live results include polling/recovery, private signed previews, meaningful authenticated downloads, favorites, confirmed publication, revocation, and recipe review before retry.
- History and the completed-run library share search, media/status/favorite filters, descending recency, pagination, provenance labels, and empty/error states. Guided history retains 50 records and migrates the earlier latest-run checkpoint. Cloud history loads the latest 100 records using batched asset reads and signed URLs; older job records remain in Postgres but are not paginated into this bounded view.
- Cloud records are never written into browser localStorage. Private previews refresh on the result and account library before their ten-minute signatures expire. Reused recipes preserve supported prompt/model/preset/ratio/quality/resolution/quantity/duration; references must be selected again and execution starts in free guided mode.
- Publication copies only a completed owner-controlled output to public Storage. Stable publication identity prevents duplicate public copies from repeated publishing. Revocation removes that copy and disables the share record; cached/downloaded copies cannot be retracted.
- Mocked tests verify history bounds/deduplication, filtering/sorting/pagination, favorites/cancellation persistence, duplicate active-run prevention, storage-write failures, recipe reuse, private ownership denial, and publication/revocation without exposing prompt/reference/private-path metadata.
- Chrome verified existing-run migration, dedicated result inspection, favorite persistence in filtered history, full recipe reuse, and the completed library. Free video cancellation is excluded from the completed library.
- Final quality gate: format, lint, TypeScript, and 16 suites / 69 tests pass. The webpack production build passes and generates all 33 pages. A fresh Chrome library load restores the completed favorite and excludes the cancelled video study; green actions still render dark readable text.
- No live provider API calls were made; cloud generation/publication lifecycle verification uses mocked persistence/transport. T10 retains responsive/accessibility/deployment integration checks. Development Chrome reports a hydration annotation `cz-shortcut-listen` added to the body outside server markup; do not suppress genuine hydration checks to hide this external DOM annotation.
