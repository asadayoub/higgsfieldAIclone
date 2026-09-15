# T08 — Guided and Live Generation Orchestration

Status: **Complete — verified with mocked providers; live calls intentionally excluded**

## Backend execution plan — 2026-09-15

- Implement OpenAI `gpt-image-2` text-to-image and Replicate `black-forest-labs/flux-2-pro` image/reference workflows plus `minimax/video-01` six-second video/reference workflows. Keep guided-only catalog entries distinct and use actual API capabilities for live models.
- References are owner-checked and delivered through short-lived signed URLs to Replicate. OpenAI initially supports text-only generation. One output per live run avoids hidden multi-call costs; presets append visible creative direction to the provider prompt.
- Persist immutable recipe snapshots in existing jobs. The client UUID is the idempotency identity. Service-role-only writes and compare-and-set submission/poll claims prevent duplicate paid requests. Never automatically retry an ambiguous submission; tell the user to inspect provider activity before an explicit new run.
- Replicate submit returns quickly; authenticated polling resumes from its persisted external ID. No webhook endpoint is needed for this polling-first implementation. Deadline headers bound provider execution. OpenAI image generation is synchronous, bounded to 240 seconds within a 300-second route budget; a terminated request may be ambiguous and is not silently resubmitted.
- Enforce provider feature flags, account credentials, owner scope, input schema, reference limits, and bounded submission rate before execution. Ingest only approved HTTPS delivery hosts, reject redirects, cap media bytes, check MIME/signatures, and never expose provider output URLs or raw errors to clients.
- Affected files: model catalog, request/DTO schemas, provider transport adapters, generation service/actions, runtime route budget, DB hardening migration, runner UI, and mocked tests. No live provider calls during verification, as requested by the owner.
- Verification: mocked payload/status/error/output contracts, ownership and host rejection, CAS/idempotency paths, full quality suite and browser guided journey. Apply the additive/hardening migration to the scoped Supabase project. Rollback service/UI first; read-only policy hardening may remain.
- Sources: [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation), [Replicate HTTP API](https://replicate.com/docs/reference/http), [Flux 2 Pro examples](https://replicate.com/black-forest-labs/flux-2-pro/examples), [Hailuo model](https://replicate.com/minimax/video-01). Account/model availability remains unverified without live calls.

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
- Submit, authenticated poll, cancel, explicit confirmed retry, timeout, and terminal-state handling. Webhooks are deliberately omitted in the polling-first runtime; no unsigned inbound mutation endpoint is exposed.
- Idempotency keys and immutable configuration snapshots.
- Sanitized job event log and superadmin diagnostics.
- Result ingestion into private Storage.

## Acceptance criteria

- Duplicate submissions with the same idempotency key do not create duplicate provider jobs.
- Asynchronous Replicate jobs outlive a single Vercel request and recover after page reload. OpenAI is a documented bounded synchronous workflow with safe ambiguous-submission handling.
- Provider failures map to safe product errors without leaking responses or keys.
- Guided and live jobs render through the same status/result components with unmistakable provenance.
- Any future webhook integration must verify signatures; this release uses authenticated polling only.

## Verification

- Adapter contract tests with recorded safe fixtures.
- State transition, retry, cancellation, timeout, and idempotency tests.
- Owner-approved verification scope: mocked image/video request, lifecycle, persistence, and ingestion tests instead of live API calls. No paid/live model smoke test is required or claimed in this release.

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

## Backend and result verification — 2026-09-15

- OpenAI/Replicate adapters are registered as per-request, credential-scoped server instances. Studio validates provider/media flags before review; the backend independently enforces flags, credentials, cost consent, capability limits, references, and the per-owner reservation limit.
- SQL `0003_generation_runtime.sql` applied successfully to the scoped Supabase project, including server-owned job/asset/publication mutations and read-only generated Storage objects. No records or media were deleted.
- Authenticated jobs use persisted UUID idempotency, a submission compare-and-set claim, owner-scoped reads, and a bounded poll lease. Ambiguous submissions are not repeated. Replicate ingestion retries retrieve the existing prediction output, not a new generation.
- Mocked service tests verify complete submission/poll/ingestion, duplicate identity, changed-recipe rejection, disabled provider, cross-owner denial, ambiguous submission, stale jobs, concurrent poll lease, cancellation, and retrieval recovery. Transport tests verify actual API payload mappings, bounded bodies, safe errors, output signatures, byte limits, HTTPS delivery-host restrictions, and refusal of path/host injection.
- Chrome verified: Hailuo live controls are limited to six seconds, 720p, one reference, and one output; missing key/admin enablement blocks review. Free motion-study submission and cancellation persist a cancelled state.
- Final quality gate: format, lint, TypeScript, and all 16 suites / 69 tests pass. The webpack production build passes and generates all 33 pages. Paid provider API calls remain intentionally untested. Deployment must configure encryption, Supabase service access, provider availability, model access/billing, and Vercel Fluid compute before real runs.
- Responsive/keyboard release QA and deployed-cloud integration belong to T10. Earlier guided-checkpoint pending items are superseded where covered above.
