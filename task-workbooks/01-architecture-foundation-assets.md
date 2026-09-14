# T01 — Architecture, Foundation, and Asset System

Status: **Planned — ready for implementation**

## Objective

Create the production-grade base that every user-facing feature will rely on: the Next.js application, environment contract, Supabase architecture, access model, provider abstraction, job lifecycle, design foundations, and original media asset kit.

This task deliberately precedes feature implementation. Its output should make later feature work additive instead of forcing architecture rewrites.

## Product modes

### Guided mode

- Available to signed-out visitors.
- Uses original curated media and the real generation job state machine.
- Requires no external provider credential.
- Always displays `Guided` provenance so it cannot be mistaken for live model output.

### Live mode

- Available only to authenticated testers and superadmins.
- Requires a valid user-owned or administrator-managed provider connection.
- Shows model, provider, settings, estimated cost/usage note, and confirmation before submission.
- Stores inputs and results privately by default.

## Architecture decisions

### Application

- Next.js App Router with TypeScript and React Server Components.
- Server Components for catalog/metadata and initial page structure.
- Client Components only for interaction-heavy islands.
- Route handlers for provider callbacks and explicit API contracts; server actions for authenticated mutations where appropriate.
- Tailwind CSS for tokens and responsive styling; Motion for focused transitions; Lucide for icons.

### Backend platform

- Supabase Free for Postgres, Auth, row-level security, and Storage.
- Drizzle for typed server queries and additive SQL migrations.
- Browser cache is an optimization for guided history, never the source of truth for authenticated data.
- Supabase service-role access is restricted to server-only modules.

### Roles

- `visitor`: public discovery and guided workflows.
- `tester`: personal live-provider connections, private generations, history, and assets.
- `superadmin`: tester access, global provider connections, provider feature flags, job diagnostics, and platform maintenance.
- Authorization is enforced server-side and with database/storage policies; hiding UI is not authorization.

### Storage layout

- `showcase-public` bucket: curated product assets and explicitly published generation results.
- `generation-private` bucket: `users/{userId}/generations/{generationId}/...`.
- `reference-private` bucket: `users/{userId}/references/{referenceId}/...`.
- Private objects are accessed through short-lived signed URLs after ownership checks.
- Vercel runtime filesystem is treated as temporary and never used as durable storage.

### Provider credential security

- Tester provider keys are submitted only over authenticated HTTPS to a server action/route.
- Secrets are encrypted with AES-256-GCM using `PROVIDER_KEY_ENCRYPTION_SECRET` from Vercel environment configuration.
- Store ciphertext, IV, authentication tag, provider, owner, label, last-four fingerprint, timestamps, and validation status.
- Never return decrypted credentials to the browser after creation.
- Never include credentials in logs, exceptions, analytics, job payload snapshots, or client-rendered data.
- A tester can delete or replace only their own connections; a superadmin can manage separately scoped global connections.

### Provider adapter contract

```ts
type ProviderAdapter = {
  provider: ProviderId;
  capabilities(): ProviderCapabilities;
  validateCredential(secret: string): Promise<CredentialCheck>;
  submit(input: GenerationRequest): Promise<ProviderJob>;
  poll(job: ProviderJob): Promise<GenerationUpdate>;
  cancel?(job: ProviderJob): Promise<void>;
  verifyWebhook?(request: Request): Promise<VerifiedWebhook>;
};
```

All guided and live executions map onto the same internal statuses:

`draft → awaiting_confirmation → queued → processing → complete | failed | cancelled`

Long video operations are submit-and-poll or webhook-driven; no Vercel request waits for the entire render.

## Foundation deliverables

- Next.js project scaffold with strict TypeScript.
- Package scripts for dev, lint, type-check, test, end-to-end test, and build.
- Environment schema and `.env.example` with names only.
- `src/config`, `src/lib`, `src/server`, `src/components`, and route conventions.
- Supabase browser/server client boundaries.
- Drizzle configuration and first additive migration.
- Authentication middleware skeleton and protected-route convention.
- Provider adapter types with a guided adapter and empty live-provider registry.
- Generation state-machine types and transition guards.
- Central error/result types and redacted logging helper.
- Baseline metadata, robots, sitemap, favicon, OG image, and manifest.
- `.gitignore` covering local secrets, build artifacts, generated test output, and OS files without excluding `.agent-logs/`.

## Original asset kit

Create an original, internally consistent media kit before building the gallery:

- Product wordmark/mark, favicon, and monochrome navigation mark.
- One 3:2 launch/OG cover.
- Twelve showcase stills across fashion, cinematic, product, graphic, surreal, and lifestyle categories.
- At least four portrait, four landscape, and four square/near-square compositions.
- Three video poster frames and, if economical, short lightweight preview loops.
- Six model/preset thumbnails.
- One empty-library illustration.
- One generation-processing texture or frame sequence.
- Neutral fallback image for failed media.

Asset requirements:

- No Higgsfield-owned media or protected hotlinks.
- No third-party logos or identifiable public figures.
- Consistent art direction: editorial realism, tactile grain, restrained blacks, electric-lime system accent only in UI—not baked into every image.
- Export web-ready AVIF/WebP with explicit dimensions and meaningful filenames.
- Record prompt, source, dimensions, and intended placement in an asset manifest.
- Keep original source files outside the runtime bundle when they are not needed by the product.

## Expected file areas

```text
src/app/
src/components/
src/config/
src/lib/
src/server/
src/types/
drizzle/
public/brand/
public/media/showcase/
public/media/presets/
public/media/system/
tests/
```

## Acceptance criteria

- The application starts locally and produces a clean production build.
- Strict type checking, lint, and a foundation unit test pass.
- Environment parsing fails safely with a clear server-only message.
- Guided mode can be selected without a Supabase or provider secret.
- Server-only modules cannot be imported into client components.
- The generation state machine rejects invalid transitions.
- The storage and role model are represented in additive migrations/policies.
- Provider credentials have an encryption round-trip test and a redaction test.
- The original asset manifest is complete and every referenced runtime asset exists.
- No secret, copied protected media, or temporary project language is present in product documentation or UI.

## Verification plan

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Browser checks:

- Load the base shell at desktop and mobile widths.
- Verify missing optional provider configuration does not crash the public app.
- Verify protected placeholders redirect signed-out users without a flash of private content.
- Inspect network and console output for credentials or sensitive storage paths.

## Risks and fallbacks

- Supabase project setup may require account access. Keep the schema/migrations ready and allow guided mode to boot without remote services.
- Generated assets can dominate bundle size. Enforce dimensions, compression budgets, and lazy loading from the start.
- Supporting too many providers early can destabilize the contract. Implement the adapter interface now and add only one image and one video provider first.
- Browser-accessible environment variables can leak secrets. Only explicitly public Supabase URL/anon values use the `NEXT_PUBLIC_` prefix.

## Rollback

The task is foundation-only and should remain one reversible checkpoint. Schema changes are additive. If remote services are unavailable, the app falls back to guided mode while retaining the same internal interfaces.
