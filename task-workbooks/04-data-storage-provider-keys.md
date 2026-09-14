# T04 — Database, Storage, and Secure Provider Connections

Status: **Draft plan — refine before implementation**

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

