# T08 — Guided and Live Generation Orchestration

Status: **Planned — guided runner implementation in progress**

## Implementation plan — guided checkpoint

- First attach the free visitor flow to confirmation: bounded local job persistence, immutable recipe snapshot, deterministic authored results, timestamp-derived queue/progress, reload recovery, and cancellation.
- Guided outputs are explicitly authored studies. References, quality, resolution, and duration do not transform them; video studies are motion posters, not generated clips. This limitation is shown before running and on the result.
- Store only validated configuration, job identity, creation time, and cancellation time in localStorage. Never persist reference bytes, blob URLs, credentials, or provider responses. Reject corrupt records and impossible timestamps. One active job prevents accidental duplicate runs.
- Affected files: guided job library and tests, studio runner component, confirmation wiring. No schema migration or cloud call is needed for this checkpoint.
- Verify deterministic selection, timing, reload recovery, cancellation, validation, duplicate submission, storage failure messaging, browser confirmation/result, and full lint/type/test suite. Rollback by reverting the runner; old reviewed drafts remain separate.
- Live adapters, durable authenticated jobs, provider cost confirmation, webhook verification, ingestion, and live smoke tests remain subsequent T08 work. Do not represent this checkpoint as complete T08.

## Objective

Run guided and real-provider workflows through one reliable asynchronous job model with clear progress and recovery.

## Dependencies

- T04 encrypted connections and provider registry.
- T07 validated generation request.

## Planned deliverables

- Guided adapter using deterministic original outputs.
- First image provider adapter and first video provider adapter.
- Submit, poll, webhook, cancel, retry, timeout, and terminal-state handling.
- Idempotency keys and immutable configuration snapshots.
- Sanitized job event log and superadmin diagnostics.
- Result ingestion into private Storage.

## Acceptance criteria

- Duplicate submissions with the same idempotency key do not create duplicate provider jobs.
- Long jobs outlive a single Vercel request and recover after page reload.
- Provider failures map to safe product errors without leaking responses or keys.
- Guided and live jobs render through the same status/result components with unmistakable provenance.
- Webhooks verify signatures where supported.

## Verification

- Adapter contract tests with recorded safe fixtures.
- State transition, retry, cancellation, timeout, and idempotency tests.
- One controlled live image and video smoke test using owner-approved credits/keys.

## Risks

- Provider APIs differ substantially. Keep transformations inside adapters and keep the internal job contract narrow.
- Vercel Hobby duration limits require submit/poll or webhook flows rather than waiting synchronously.

## Guided checkpoint verification

- Chrome: free confirmation identifies authored output, unchanged reference pixels, browser-only storage, and no external charges. Running produces a clearly labeled authored image study; leaving for Explore and reopening Studio restores the result and immutable recipe.
- Chrome computed colors confirm dark action text on lime links and buttons. The contrast regression test checks both default/hover tokens against AAA contrast and ensures the link reset remains in the base cascade layer.
- Lint, typecheck, and 12 Vitest suites / 40 tests pass. Guided tests cover recipe snapshots, timestamp-derived recovery, cancellation, malformed/oversized/future records, deterministic results, media type, quantity, and refusal of live recipes.
- The webpack production build passes, including TypeScript and all 32 generated pages.
- T07 implementation is stable and owner-tested; remaining upload-security and responsive checks do not change the guided runner contract. T07 is not being implemented concurrently, and its unverified checks remain visible.
- Still pending: browser cancellation, automated duplicate-click/storage-failure coverage, mobile review, and live orchestration. This is a working guided checkpoint, not the completion of T08.
