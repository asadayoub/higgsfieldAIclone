# T09.1 — OpenRouter Real Image and Video Generation

Status: **Implemented and automated checks passing — manual QA and paid smoke tests pending**

## Objective

Make every Studio generation a real, authenticated OpenRouter request. Remove authored guided outputs and motion-poster results from the generation journey while keeping the original Explore media as clearly labeled inspiration. Each verified user receives three system-funded generations per UTC day and can explicitly use a personal OpenRouter key for additional runs.

## Product decisions

- OpenRouter becomes the single generation gateway for both image and video. The platform has a server-only system key, and a user may connect one encrypted personal OpenRouter key under Provider connections.
- Generation requires authentication, verified email, an enabled media flag, a model-compatible recipe, and an explicit choice of `Free daily allowance` or `Personal OpenRouter key`.
- Every verified user can use at most three system-funded generations per UTC calendar day. One provider-accepted image or video job consumes one slot regardless of modality.
- Personal-key runs do not consume the free allowance. They require a valid personal key and explicit external-cost confirmation.
- Never silently fall back from the free allowance to a personal key or from a personal key to the system key. The credential source shown at confirmation is immutable for that run.
- There is no fake or deterministic generation mode. The free daily allowance funds real OpenRouter requests. Explore remains public; entering Studio without a session leads to sign-in and returns to the intended recipe afterward.
- Existing authored SVGs and posters remain in Explore as original inspiration. They are not inserted into History, Assets, or Results as generated output.
- Existing OpenAI and Replicate adapters remain disabled and unreachable for one release as rollback code. Remove them only after OpenRouter image and video smoke tests pass in production.
- The first release uses a curated allowlist rather than exposing every catalog model. OpenRouter discovery data validates capabilities and pricing, but an unexpected newly listed model must not become executable without product review.
- Initial output quantity is one for both media types. This reduces accidental spend and simplifies ingestion. Multi-output image generation can be added after cost and UX telemetry are available.

## Funding modes and daily quota

### System-funded allowance

- Store the platform credential only as `OPENROUTER_SYSTEM_API_KEY` in local/Vercel server secrets. It never enters the user credential table, browser bundle, API response, logs, agent logs, or admin UI.
- A verified account receives three reservations for the UTC day (`00:00:00Z` through the next midnight). Studio shows the remaining count and exact UTC reset time.
- The system-funded catalog is narrower than the personal-key catalog: reviewed low-cost models, one output, bounded image resolution, and bounded video duration/resolution.
- Use an OpenRouter-side key spending limit or guardrail plus an application-level global daily budget as independent circuit breakers. A superadmin can disable system-funded image or video without disabling personal-key execution.
- At zero remaining, offer `Use personal key` or the next reset time. Never charge a saved personal key automatically.

### Personal-key mode

- Users can connect an encrypted OpenRouter key and explicitly select it for a run. These runs keep hourly and active-job abuse limits but do not consume the free allowance.
- Confirmation states that OpenRouter charges the user's account and shows available unit or estimated pricing.
- The approved personal-key catalog may be broader than the free catalog, but remains reviewed and capability constrained.

### Atomic accounting rules

- Reserve a free slot and its generation job in one server-only database transaction. Do not perform a separate count followed by insert; concurrent tabs must not exceed three.
- A unique generation UUID makes retries return the original run without consuming another slot.
- Invalid recipes, missing flags, unverified accounts, missing system configuration, and definite provider rejection before acceptance do not consume a slot.
- Once OpenRouter accepts a request, the slot is consumed even if it later fails, is moderated, expires, or cannot be ingested, because provider cost may already exist.
- An ambiguous submission remains consumed and is marked for administrator reconciliation; it is never retried automatically.
- Release a reservation only when transport evidence proves no provider request was accepted. Only the service role can change reservation state.
- Store the UTC quota date and credential source on the job so historical accounting remains stable.

## Initial model policy

The exact launch allowlists are selected from OpenRouter's live discovery endpoints during implementation. Prefer:

- two image models: one general text/reference model and one high-fidelity model;
- two video models: one cost-conscious model and one premium cinematic model;
- models with explicit aspect-ratio, resolution, duration, reference, and pricing metadata;
- stable canonical slugs, supported account access, and an output format accepted by private ingestion;
- a tightly bounded low-cost subset for system-funded runs and a separately reviewed broader subset for personal-key runs.

Do not hard-code capabilities from marketing names. Cache the approved model descriptors server-side and fail closed if a selected model disappears or its required capability changes.

## API design

### Credential validation

- Extend the provider ID union and connection form with `openrouter`.
- Validate a submitted key with `GET https://openrouter.ai/api/v1/key`, not a paid generation.
- Store only AES-GCM ciphertext, IV, authentication tag, key version, fingerprint, last four characters, label, validation state, and timestamps. Never return or log the key.
- Display safe key metadata such as label, remaining key limit when returned, and last validation time. Do not require a management key.
- Health-check the system key from a server-only admin diagnostic. Never expose its label, suffix, balance, usage, or validation response to ordinary users.

### Model discovery

- Images: read `GET /api/v1/images/models`, followed by the selected model's endpoint record for definitive parameters and pricing.
- Videos: read `GET /api/v1/videos/models` for duration, resolution, ratio, frame/reference support, audio capability, passthrough options, and pricing SKUs.
- Normalize remote descriptors into an internal capability contract. Cache with a bounded TTL and retain a reviewed fallback snapshot for temporary discovery outages.
- Intersect remote capabilities with the application allowlist. Never trust model IDs or provider passthrough fields supplied by the browser.

### Image execution

- Submit `POST /api/v1/images` with an allowlisted model, bounded prompt, one output, and only supported fields.
- Map resolution, aspect ratio, quality, output format, seed, and input references only when the selected endpoint declares them.
- Private reference images use short-lived signed Supabase URLs or bounded base64 data URLs. Prefer signed URLs when OpenRouter can fetch them within the expiry window.
- Decode `data[0].b64_json` on the server. Validate decoded size, MIME signature, declared media type, and image dimensions before uploading to `generation-private`.
- Persist returned usage cost when present. A successful provider response is not marked complete until private storage and the asset record succeed.
- Resolve either the system key or the user's decrypted key from the immutable funding mode only after quota, authorization, and capability checks pass.

### Video execution

- Submit `POST /api/v1/videos` and persist the returned OpenRouter job ID before returning the run.
- Poll `GET /api/v1/videos/{jobId}` on user refresh and controlled client intervals. Map `pending`, `in_progress`, `completed`, and `failed` to the internal state machine.
- On completion, retrieve `GET /api/v1/videos/{jobId}/content?index=0` with the user's OpenRouter key. Do not fetch the reported content URL as an unauthenticated arbitrary URL.
- Stream or buffer with a strict byte limit, verify `video/mp4` and file signature, then copy the result into private Supabase Storage.
- Start polling-first. Add a webhook only after configuring `OPENROUTER_WEBHOOK_SECRET`; verify the raw-body HMAC-SHA256 signature, reject timestamps older than five minutes, deduplicate `X-OpenRouter-Idempotency-Key`, and re-read job status before ingestion.
- Do not promise cancellation until an official supported cancel endpoint is confirmed for the chosen model/API. Removing a local run must not be represented as cancelling provider billing.
- Limit system-funded video to the approved low-cost model, shortest supported duration, bounded resolution, and one output unless a superadmin changes a reviewed policy.

## Data and schema changes

- Add `openrouter` rows to provider feature flags without deleting legacy rows.
- Keep `provider_credentials.provider` and `generation_jobs.provider` as text, but enforce application allowlists on every write.
- Add nullable generation accounting fields: remote generation ID, cost in USD as a decimal-safe value, usage JSON limited to sanitized numeric fields, resolved model slug, and endpoint/provider tag where available.
- Add immutable credential source (`system_free` or `personal_key`), UTC quota date, reservation state, reserved/consumed timestamps, and an optional reconciliation code.
- Add an indexed quota ledger keyed by owner, UTC date, and generation ID. Database authorization and atomic locking must enforce at most three active or consumed system-funded slots per owner/day.
- Add independent flags for system-funded image, system-funded video, personal-key image, and personal-key video.
- Preserve the immutable submitted recipe and store a normalized capability snapshot used for that run.
- Add webhook delivery deduplication only if webhooks are enabled.
- Existing guided browser history remains readable as archived local history for one release, labeled `Legacy authored study`. It cannot be retried, republished as an AI result, or mixed into cloud Assets. A later cleanup can offer a local-only dismiss action.

## Studio and UX migration

- Remove the Guided/Live selector, free-run language, deterministic progress simulation, and motion-poster generation path.
- Add an explicit funding selector: `Free daily allowance` and `Personal OpenRouter key`. Show remaining slots beside the free choice and never preselect personal billing when free quota is exhausted.
- Replace unsupported catalog cards with only approved OpenRouter models. Controls update from normalized capabilities after model selection.
- Signed-out users may prepare a recipe, but Generate opens sign-in and preserves a safe return URL. References must be reselected after authentication unless already uploaded to the user's private path.
- System-funded confirmation shows remaining quota before and after the run and explains that one slot is consumed when OpenRouter accepts it.
- Personal-key confirmation shows model, settings, references, privacy, pricing, and that the user's OpenRouter balance is charged, with a required cost checkbox.
- Image runs show submitting/processing/saving states. Video runs show queued/processing/saving states with a realistic several-minute expectation and recover after navigation or reload.
- Results and Assets show OpenRouter provenance, resolved model, completion date, and actual cost when returned. Provider errors remain sanitized; administrators see safe codes and job identifiers only.
- Empty states explain the three-per-day allowance and that additional generation requires a connected OpenRouter key with credits. They do not imply that hosting free tiers cover model execution.

## Security and privacy requirements

- Keep keys server-only and decrypt only for an authorized owner operation.
- Recheck session ownership, provider flag, model allowlist, capability compatibility, reference ownership, rate limits, and cost confirmation at submission time.
- Bound all provider response bodies, decoded base64, output downloads, prompts, model IDs, webhook bodies, and stored metadata.
- Never expose OpenRouter job content endpoints, signed reference URLs, provider payloads, keys, or raw error bodies to the browser or logs.
- Rate-limit credential checks, submissions, and polling. Continue using UUID idempotency and compare-and-set claims so retries do not duplicate paid requests.
- Require verified email for system-funded runs. Add account-age or IP/device abuse telemetry only if needed and with a documented retention policy; do not collect opaque fingerprints by default.
- Protect the system key with an OpenRouter spending cap/guardrail and an application global daily budget. Fail closed when its budget, health check, or feature flag is unavailable.
- Document that OpenRouter video is not eligible for Zero Data Retention because asynchronous output must be retained temporarily by the provider.
- Recommend a dedicated OpenRouter key with a spending limit and restricted model access for each tester.

## Expected file changes

- `src/content/studio-models.ts`: curated OpenRouter catalog and capability mapping.
- `src/lib/studio/validation.ts`: real-only configuration validation and dynamic capability intersection.
- `src/lib/generation/contracts.ts`: remove guided execution from new submissions; add provenance/accounting fields.
- `src/config/env.ts` and `.env.example`: server-only system key and optional webhook secret; neither may use a `NEXT_PUBLIC_*` name.
- `src/server/providers/types.ts`, `registry.ts`, `validation.ts`, `connections.ts`: OpenRouter provider identity, safe validation, and adapter registration.
- `src/server/providers/live.ts`: split into focused OpenRouter image/video transports and parsers.
- `src/server/providers/media.ts`: authenticated OpenRouter video content ingestion plus image media-type support.
- `src/server/generation/service.ts`: synchronous image ingestion, asynchronous video polling, accounting, and recovery.
- `src/components/studio/generation-studio.tsx`: remove guided mode and bind controls to approved capabilities.
- `src/components/studio/guided-runner.tsx`: remove from the active product and delete after archived-history compatibility is isolated.
- `src/components/generation/*`, History, Assets, provider settings, and Admin: provenance, costs, status, connections, and flags.
- Add an idempotent SQL migration after `0003_generation_runtime.sql` for funding mode, quota ledger, accounting, indexes, atomic reservation/release functions, and independent flags.
- Update README, environment example, tests, tasks, and deployment documentation.

## Implementation sequence

1. Capture safe live discovery responses for the candidate allowlist; select launch models and record their capabilities and unit pricing.
2. Add OpenRouter identity, encrypted personal connection, system-secret health check, and independent funding/media feature flags.
3. Implement the atomic UTC quota ledger and reservation/release transaction, then concurrency-test the three-run boundary.
4. Add normalized discovery types with separate system/personal allowlists, a cache, and reviewed fallback snapshot.
5. Implement image execution, strict decoding, private ingestion, funding accounting, and mocked contract tests.
6. Implement video submission, persisted recovery, authenticated download, ingestion, and mocked lifecycle tests.
7. Migrate Studio to real-only execution with explicit funding selection and remove dummy entry points while retaining read-only legacy history.
8. Update Results, History, Assets, Admin, budgets, documentation, and deployment configuration.
9. Apply the idempotent migration to the scoped Supabase project.
10. Run the full automated suite and browser QA at desktop, tablet, and mobile widths.
11. With explicit owner approval and capped keys, run one lowest-cost system-funded image test, one shortest system-funded video test, and one personal-key routing test. Record funding mode, quota change, model, job ID fragment, cost, ingestion, and cleanup.

## Test plan

- Unit: capability normalization, allowlist intersection, payload mapping per modality, status mapping, output decoding, MIME/signature checks, cost parsing, signature verification, error sanitization, and legacy-history labeling.
- Service: unauthorized/unverified access, missing system key, missing/revoked personal key, independent flags, unsupported model/settings, cross-owner reference, duplicate UUID, immutable funding mode, quota boundary, concurrent fourth submission, UTC reset, definite rejection release, post-acceptance failure consumption, ambiguous submission consumption, video recovery, duplicate poll lease, failed output copy, and re-ingestion without regeneration.
- Fixtures: safe, redacted OpenRouter model lists, image success/error bodies, video submit/poll/failure bodies, and content responses. Refresh fixtures deliberately when API contracts change.
- Browser: sign-in return, `3/2/1/0` allowance states, UTC reset copy, explicit funding choice, no silent personal-key fallback, key connection, model-control changes, image completion, video recovery after reload, private result actions, errors, independent Admin flags, keyboard flow, reduced motion, and 390/1024/1440 layouts.
- Quality gate: format check, lint, TypeScript, unit/service tests, production webpack build, migration review, and signed-out production smoke test.

## Acceptance criteria

- No active Studio path can create an authored/dummy result or describe a motion poster as generated video.
- A verified owner can run at most three system-funded image/video jobs per UTC day, atomically enforced across concurrent tabs.
- A signed-in owner can connect an encrypted OpenRouter key and explicitly run approved models without consuming the free allowance.
- The product never silently switches credential sources; every job records `system_free` or `personal_key`.
- Image and video output bytes are validated and copied to owner-private storage; provider URLs and keys never reach the client.
- Video jobs survive navigation and reload without duplicate paid submission.
- Model controls cannot submit combinations absent from the selected model's current approved capabilities.
- History, Results, Assets, and Admin show accurate OpenRouter provenance and safe status/cost information.
- Existing guided local records are visibly archived and cannot be mistaken for real AI output.
- Mocked contract/concurrency tests and capped live smoke tests for both funding paths pass before tester rollout.

## Rollout and rollback

- Deploy schema/backend support with every system-funded and personal-key OpenRouter flag disabled.
- Enable personal-key execution for the superadmin smoke test first. Enable system-funded execution only after the quota ledger, OpenRouter spending limit, and global budget circuit breaker are verified.
- Roll out free usage to a small verified cohort before all users; monitor consumed slots, actual costs, failure rates, and suspicious multi-account patterns.
- Keep legacy OpenAI/Replicate adapters disabled but intact for one release. Rollback by disabling OpenRouter flags; existing jobs and private outputs remain readable.
- Never roll back the database destructively. Additive columns and historical provenance remain valid even if execution is disabled.

## Risks and mitigations

- **Catalog drift:** curated allowlist plus live capability intersection fails closed.
- **Unexpected spend:** one output, explicit confirmation, per-user rate limits, displayed pricing, and dedicated capped OpenRouter keys.
- **System-key abuse:** verified accounts, atomic daily quota, low-cost allowlist, media kill switches, provider key cap, global daily budget, and admin monitoring.
- **Concurrent quota race:** reserve the generation and free slot in one database transaction with generation-ID idempotency.
- **Long video jobs:** persisted external IDs, polling leases, optional verified webhooks, and reload recovery.
- **Ambiguous image submission:** no automatic paid retry; show a clear account-activity check before a new run.
- **Provider retention:** disclose that asynchronous video is not ZDR-compatible.
- **Breaking beta/catalog behavior:** isolate OpenRouter transport and parsers, retain safe fixtures, and gate rollout.

## Primary references

- [OpenRouter image generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
- [OpenRouter video generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)
- [OpenRouter image model discovery](https://openrouter.ai/docs/api/api-reference/images/list-image-models)
- [OpenRouter video model discovery](https://openrouter.ai/docs/api/api-reference/video-generation/list-videos-models)
- [OpenRouter current-key validation](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key)

## Planning report — 2026-09-26

- The current product has a clean seam for this migration: encrypted per-user provider credentials, server-owned jobs, UUID idempotency, private reference/result storage, result recovery, admin flags, and sanitized diagnostics already exist.
- The current model catalog and configuration schema are static and provider-specific. They must be normalized around OpenRouter capabilities rather than renamed in place.
- OpenRouter image generation is synchronous and returns base64 output; it can reuse the current bounded server-side image ingestion pattern.
- OpenRouter video generation is asynchronous and returns a job ID for polling; it can reuse the current persisted Replicate lifecycle with different statuses and authenticated content retrieval.
- The largest product change is removing anonymous guided execution. Public Explore remains useful, while generation, History, and private Assets become an authenticated real-provider experience funded either by the platform allowance or the user's key.
- Funding has two explicit paths: three platform-funded runs per verified user per UTC day and personal-key runs paid by the user. Credential source is fixed per job and never changes through fallback.
- No implementation, database mutation, credential use, or paid API call was performed during this planning task.

## Implementation checkpoint — 2026-09-26

- Prepared additive migration `drizzle/0004_openrouter_funding.sql`; it has not been applied by the agent or verified against Supabase.
- Added curated OpenRouter image/video catalogs, live capability intersection, encrypted personal-key validation, server-only system-key routing, atomic reservation calls, private ingestion, persisted video polling, and safe accounting fields.
- Replaced the active Guided/Live Studio choice with explicit free-allowance and personal-key funding. Legacy authored studies remain read-only in History and are excluded from cloud Assets.
- Added independent OpenRouter media/funding kill switches and safe admin diagnostics. Every new OpenRouter flag remains disabled after migration.
- Polling is the initial video recovery mechanism. A webhook is intentionally not enabled until an official signing/delivery contract is confirmed; the environment placeholder is reserved for that later rollout.
- No migration, test, lint, type-check, formatter, build, database command, browser QA, or paid request has run at this checkpoint, as required by the SQL handoff gate.

## Verification report — 2026-09-26

- The owner confirmed that `drizzle/0004_openrouter_funding.sql` completed successfully in Supabase. The agent did not access or control Supabase.
- Focused OpenRouter/funding tests: 2 files, 8 tests passed.
- Updated service and compatibility tests: 7 files, 38 tests passed.
- Final full suite: 18 files, 74 tests passed.
- TypeScript: `npm run typecheck` passed.
- ESLint: `npm run lint` passed.
- The initial non-writing Prettier check identified 13 touched files; only those files were formatted. The repeated `npm run format:check` passed.
- Production build: `npx next build --webpack` passed, including static generation for all 33 routes.
- The development server was restarted and reported ready on port 3000 after the build.
- No browser automation, live OpenRouter generation, paid request, or external smoke test was performed.
- Manual responsive, accessibility, auth, quota, storage, and provider smoke QA remains owner-operated and pending.

## System image catalog expansion — 2026-09-26

- Added Recraft V4.1 Flash as the default low-cost system text-to-image option.
- Added Nano Banana 2 Lite at 1K with a bounded three-reference application limit.
- Retained GPT Image 1 Mini as an explicitly selectable alternative.
- Model-specific payload construction omits unsupported quality, resolution, output-format, and reference fields.
- There is no automatic model fallback: a rejected selection fails safely without submitting another paid request.
