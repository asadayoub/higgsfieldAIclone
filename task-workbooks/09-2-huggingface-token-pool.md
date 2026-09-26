# T09.2 — Hugging Face System Credential Pool

## Status

In progress. The database migration and application implementation are being prepared. No migration, automated check, browser check, or paid inference is considered complete until recorded below.

## Objective

Add Hugging Face as an explicit system-funded image provider backed by a superadmin-managed pool of encrypted, authorized Hugging Face access tokens. A generation atomically leases a compatible healthy credential, makes at most two provider attempts, validates the result, and saves it to owner-private Supabase Storage.

## Non-goals

- Hugging Face video generation.
- Arbitrary model IDs supplied by browsers or administrators.
- Silent fallback to OpenRouter or a personal credential.
- Treating multiple tokens from one Hugging Face account as separate free-credit balances.
- Pooling accounts or tokens to evade Hugging Face limits or terms.
- Revealing, exporting, or redisplaying a stored token.
- Automated Supabase or live paid-provider execution.

## Dependencies

- T03 superadmin authorization and audit trail.
- T04 AES-GCM credential encryption and private Storage.
- T08 provider adapters and generation lifecycle.
- T09 results, history, and asset library.
- T09.1 atomic system allowance and real-media ingestion.

## Fixed architecture decisions

- Only superadmins can add or manage system credentials.
- Tokens must be owned by the project or supplied with explicit authorization.
- Fine-grained/read-only inference tokens are preferred.
- Tokens are encrypted before database persistence with the existing server-only encryption key.
- A SHA-256 fingerprint prevents duplicate token insertion; only the final four characters are displayed.
- Pool selection is performed by a service-role-only Postgres function using row locks and `skip locked`.
- Selection orders by priority, active leases, and least-recent use.
- Initial maximum concurrency is one per credential unless an admin selects a lower-risk supported value.
- Each generation makes at most two credential attempts.
- Authentication failures invalidate a credential; rate limits apply a cooldown; confirmed credit exhaustion marks it exhausted; ambiguous submissions are not retried.
- Expired leases are reclaimed during future acquisitions; no persistent worker is required for the first release.
- Hugging Face and OpenRouter system-funded runs share the existing three-per-user daily UTC allowance.
- Provider selection is explicit. No cross-provider fallback occurs.
- Hugging Face launches image-only behind an independent kill switch.
- Browser responses and ordinary logs never identify the leased credential.

## Data changes

### `system_provider_credentials`

Stores encrypted system credentials and safe scheduling metadata:

- provider and administrator label;
- AES-GCM ciphertext, IV, authentication tag, and key version;
- unique non-reversible fingerprint and safe suffix;
- active/draining/cooldown/exhausted/invalid/disabled/revoked state;
- priority, concurrency, local UTC daily request limit, and cooldown;
- approved media and model arrays;
- validation and health timestamps/codes;
- success/failure counters and current active leases;
- creating/updating administrator and revocation/secret-erasure timestamps.

### `system_credential_leases`

Records one active/completed/failed/expired/ambiguous lease per provider attempt. A partial unique index prevents more than one active lease for a generation while an atomic acquisition function prevents concurrency over-allocation.

### `provider_generation_attempts`

Records sanitized provider attempt provenance, provider request ID, timing, safe HTTP/error data, usage, and cost. It never stores tokens, raw responses, or private output URLs.

### Generation jobs and feature flags

- Add an internal system credential reference and attempt count to generation jobs.
- Insert a disabled `huggingface` provider-feature row.
- Replace the OpenRouter-specific reservation entry point with a provider-aware system reservation function while retaining the old function for rollback compatibility.

## Server components

- System credential data-access layer with minimal DTOs.
- Token validation through a non-generative Hugging Face identity request.
- Atomic acquire/release/health-transition functions.
- Hugging Face image adapter using a curated model/provider configuration.
- Pool executor with bounded retry and ambiguous-submission protection.
- Existing validation, output inspection, private ingestion, quota, history, and result contracts extended for `huggingface`.

## Superadmin experience

- Pool summary: total, available, unavailable, and active leases.
- Add token form with label, priority, concurrency, daily ceiling, and allowed curated models.
- Safe credential rows with suffix, state, usage, health, last success/failure, and model access.
- Revalidate, activate, drain, disable, and revoke actions.
- Revocation erases encrypted secret material and cannot be undone.
- Every mutation creates an admin audit event without secret values.

## Studio experience

- Hugging Face models appear as explicit free-allowance image choices.
- The selected provider is visible before confirmation.
- A missing healthy credential reports temporary Hugging Face capacity exhaustion.
- The user may manually choose OpenRouter after failure; the application never switches automatically.

## Failure policy

| Failure                                 | Credential state                   | Allowance       | Retry                 |
| --------------------------------------- | ---------------------------------- | --------------- | --------------------- |
| 401/403                                 | invalid                            | remain reserved | once on another token |
| confirmed payment/credit exhaustion     | exhausted                          | remain reserved | once on another token |
| 429                                     | cooldown using bounded Retry-After | remain reserved | once on another token |
| unsupported model or invalid request    | unchanged                          | released        | none                  |
| definite 5xx before acceptance          | short cooldown                     | remain reserved | once                  |
| timeout/network ambiguity               | ambiguous lease                    | consumed        | none                  |
| accepted request or valid output        | active                             | consumed        | none                  |
| output ingestion failure after response | active                             | consumed        | none                  |

If all attempted credentials definitely reject before acceptance, the daily reservation is released.

## Security requirements

- Authenticate and authorize inside every Server Action.
- Validate every form field with Zod and re-read credential state server-side.
- Use service-role-only RPCs for leasing and credential health changes.
- Revoke direct anonymous/authenticated access to credential, lease, and attempt tables.
- Superadmins receive safe DTOs only; encrypted columns never enter React props.
- Redact `hf_` token-shaped strings in diagnostic paths.
- Use explicit provider/model allowlists and bounded response bodies.
- Reject redirects when retrieving provider output.
- Keep output private until an existing explicit publication action occurs.

## Implementation order

1. Task/workbook planning gate.
2. Idempotent migration and Drizzle schema.
3. Credential encryption, validation, data access, and atomic leasing.
4. Hugging Face catalog and image adapter.
5. Provider-aware generation reservation and execution.
6. Superadmin pool controls and diagnostics.
7. Explicit Studio provider/model integration.
8. Results/history provenance updates.
9. SQL handoff and manual Supabase confirmation.
10. Automated checks, then manual browser QA and optional smoke generation.

## Expected file areas

- `drizzle/0005_huggingface_system_pool.sql`
- `src/server/db/schema.ts`
- `src/server/providers/huggingface-*`
- `src/server/providers/registry.ts`
- `src/server/generation/service.ts`
- `src/app/admin/actions.ts`
- `src/app/admin/page.tsx`
- `src/content/studio-models.ts`
- `src/lib/generation/*`
- tests for credentials, pooling, adapters, generation, and actions
- environment/deployment documentation where required

## Automated verification after SQL confirmation

1. Migration/read-only compatibility queries.
2. Focused pool, adapter, and quota tests.
3. Full Vitest suite.
4. TypeScript check.
5. ESLint.
6. Prettier check without rewriting.
7. Production webpack build.

## Manual QA after automated checks

- Add a valid authorized token without triggering generation.
- Reject duplicate and invalid tokens safely.
- Verify encrypted fields never appear in page source or network responses.
- Enable Hugging Face system images and generate one approved image.
- Verify allowance transition and private result ingestion.
- Disable/drain/reactivate one token.
- Confirm no automatic OpenRouter fallback.
- Verify diagnostics at desktop and mobile widths with keyboard navigation.

## Rollback

- Disable `huggingface.system_image_enabled` immediately.
- Drain or disable every pool credential.
- Keep data and completed assets intact.
- OpenRouter remains independently available.
- The additive tables and columns do not need to be dropped for operational rollback.

## Completion record

Implementation prepared through the mandatory SQL checkpoint:

- Added the additive credential-pool migration, Drizzle schema, official Hugging Face SDK, curated image catalog, encrypted system-credential data layer, atomic leases, bounded attempt records, Hugging Face image adapter, shared quota execution, private ingestion, superadmin pool controls, explicit Studio provider presentation, result/history provenance, safe diagnostics, focused test files, environment documentation, and operational documentation.
- No database command or browser automation was performed.
- No automated test, type check, lint, formatter, build, or live inference request has been run.
- Waiting for manual application and confirmation of `drizzle/0005_huggingface_system_pool.sql` before verification begins.

### Database checkpoint

- The user confirmed that `drizzle/0005_huggingface_system_pool.sql` completed successfully in Supabase.
- No database browser control or automated migration command was used.
- The supplied read-only verification queries were not independently executed by the application agent.

### Automated verification

- Focused Hugging Face, credential validation, contract, quota, service, and action tests: 24 passed across 5 files.
- Full Vitest suite after formatting: 83 passed across 20 files.
- TypeScript: passed with `tsc --noEmit`.
- ESLint: passed.
- Prettier non-writing check: passed after formatting the seven reported feature files.
- Next.js 16.3.5 production webpack build: passed, including TypeScript and 33 static page generations.

### Remaining verification

- Manual superadmin, token-pool, Studio, result, history, accessibility, and responsive browser QA.
- No live Hugging Face or OpenRouter generation was submitted automatically.
- T09.2 remains in progress until manual QA and any explicitly authorized live smoke test are recorded.

### First live image incident and fix

- Manual QA submitted `black-forest-labs/FLUX.1-schnell` through Hugging Face. The provider accepted and completed the request, so the shared daily allowance correctly moved from 3 to 2, but private output ingestion failed.
- The Hugging Face Nscale SDK constructs its returned Blob with a JPEG media type even when the decoded image bytes can use another supported format. The ingestion boundary previously required the declared media type and byte signature to match exactly.
- Output ingestion now derives PNG, JPEG, or WebP from the validated byte signature and uses that detected type for dimension validation and private storage. Unknown signatures still fail closed, and video MIME validation remains strict.
- Safe reconciliation codes now distinguish a missing output, signature validation failure, invalid dimensions, private storage upload failure, asset persistence failure, and an unclassified ingestion failure. Raw provider responses and secrets remain excluded.
- The user-facing output failure text no longer promises retrieval for synchronous Hugging Face images, whose bytes are not recoverable after a failed save.
- Post-fix verification: 84 tests across 20 files passed; TypeScript, ESLint, Prettier, and the Next.js 16.3.5 production webpack build all passed.
- One additional manual generation is still required to confirm the corrected production-like ingestion path. The original failed image cannot be recovered or regenerated without using another allowance slot.
