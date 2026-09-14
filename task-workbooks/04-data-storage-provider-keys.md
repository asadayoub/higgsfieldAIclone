# T04 — Database, Storage, and Secure Provider Connections

Status: **Complete — implemented and verified**

## Objective

Make Supabase the durable product backend and let authenticated testers safely bring provider credentials without exposing secrets.

## Dependencies

- T01 schema boundaries, encryption contract, and adapter types.
- T03 authenticated identities and roles.

## Planned deliverables

- Tables for profiles, provider connections, generations, generation events, favorites, publications, and audit events.
- RLS policies for ownership and administrative access.
- Public/private Storage buckets with path policies.
- AES-GCM credential service and redacted connection summaries.
- Credential validation endpoint with rate limits and timeouts.
- Provider capability registry and per-provider feature flags.

## Acceptance criteria

- Raw credentials never appear in database query responses, browser payloads, logs, or analytics.
- Private storage objects require authenticated signed access.
- Cross-user reads and writes fail at both API and database policy layers.
- Deleting a connection prevents new jobs while preserving historical provenance.
- Public publication copies only the selected output, never its private references.

## Verification

- Migration and policy tests against a local/test Supabase project.
- Encryption tamper, wrong-key, rotation-metadata, and log-redaction tests.
- Signed URL expiry and cross-user access tests.

## Risks

- Credential storage increases security responsibility. Keep provider keys optional, owner-scoped, encrypted, and deletable; document that a dedicated secrets vault is the later production upgrade.

## Final implementation plan

### Credential boundary

- Remove direct authenticated access to `provider_credentials`; all reads and mutations go through server-only service-role operations after a verified session check.
- Return only connection IDs, provider names, labels, account labels, fingerprints, last-four suffixes, validation status, and timestamps.
- Encrypt accepted credentials with AES-256-GCM and record key-version metadata for future rotation. Never persist a rejected credential.
- Limit each owner to one active connection per provider; replacement keeps the same record identity and overwrites the encrypted payload.

### Provider verification

- Support OpenAI and Replicate connection validation through their documented authenticated account/model endpoints.
- Apply an eight-second abort timeout, bounded secret length, neutral errors, and five validation attempts per owner in ten minutes.
- Store only a short sanitized validation code. Do not store provider response bodies or credential-bearing request headers.
- Keep global provider feature flags separate from whether a user may prepare a connection.

### Data and storage

- Add generation events, favorites, publications, provider connection events, credential rotation metadata, and missing owner/admin RLS policies through an additive rerunnable migration.
- Keep `showcase-public` public-read and service-write. Keep generation and reference buckets private under `users/{ownerId}/...` paths.
- Add pure owner-path validation and server-only signed upload/download helpers with short expirations.

### Product surface

- Replace the provider-settings placeholder with connection cards for OpenAI and Replicate.
- Support connect/replace, verify again, and delete actions with clear encrypted-storage and feature-availability explanations.
- Make all mutation states accessible and ensure no secret is sent back during server-component refreshes.

### Verification additions

- Tests for tampering, wrong encryption keys, validation parsing, secret redaction, owner-path construction, traversal rejection, and cross-owner path denial.
- Browser tests for protected access, empty state, invalid credentials, replacement language, and delete confirmation.
- Read-only checks against the applied Supabase schema and buckets after migration.

## Affected files

- `drizzle/0002_secure_connections_storage.sql`
- `src/server/db/schema.ts`
- `src/server/providers/validation.ts`
- `src/server/providers/connections.ts`
- `src/server/storage/private-media.ts`
- `src/lib/storage/paths.ts`
- `src/app/settings/providers/actions.ts`
- `src/app/settings/providers/page.tsx`
- `src/components/providers/provider-connection-card.tsx`
- `tests/credentials.test.ts`
- `tests/storage-paths.test.ts`
- `tasks.md`

## Rollback

The migration is additive except for removing direct authenticated credential-table access. The settings UI can be disabled without deleting encrypted records. Restoring direct client access to the credential table is intentionally not part of rollback; server-only access remains the security floor.

## Implementation record

Completed on 2026-09-14.

- Applied the rerunnable `0002_secure_connections_storage.sql` migration to the configured Supabase project.
- Added credential key-version, account-label, validation, and revocation metadata plus one-connection-per-owner/provider enforcement.
- Removed direct authenticated access to encrypted credential records. Connection summaries are now assembled exclusively through authenticated server-only service-role reads.
- Added OpenAI and Replicate verification against their documented API endpoints with eight-second aborts, bounded inputs, sanitized errors, and five attempts per ten-minute owner window.
- Added encrypted connect/replace and owner-checked deletion operations. Only fingerprint, last-four suffix, label, account label, validation state, and timestamps reach the browser.
- Added provider connection events, generation events, asset favorites, and publications with RLS policies, plus superadmin read policies for jobs and assets.
- Added private owner-path validation and signed upload/download helpers for `generation-private` and `reference-private`.
- Replaced the settings placeholder with responsive OpenAI and Replicate cards, feature-flag state, verified summaries, replace controls, and deletion confirmation.
- Verified in Chrome that a protected tester session can reach provider settings and receives safe feedback for a rejected key.
- Verified with the authenticated anon client that credential selects expose zero rows and direct inserts are rejected by RLS.
- Verified all five new/updated tables through the live API and confirmed `showcase-public` remains public while both private buckets remain private.
- Deleted the exact temporary Auth test user and its cascading profile after verification.

Verification passed:

```text
npm run format:check
npm run lint
npm run typecheck
npm test          # 7 files, 22 tests
npm run build     # 17 routes plus Proxy
```

Operational requirement:

- `PROVIDER_KEY_ENCRYPTION_SECRET` must be set to a unique 64-character hexadecimal secret in local and Vercel server environments before a valid provider key can be stored. It remains intentionally absent from version control and agent logs.
