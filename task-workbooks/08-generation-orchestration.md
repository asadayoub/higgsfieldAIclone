# T08 — Guided and Live Generation Orchestration

Status: **Draft plan — refine before implementation**

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
