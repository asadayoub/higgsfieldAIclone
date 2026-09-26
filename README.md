# LumaForge

LumaForge is a private image-and-video creation workspace built around real OpenRouter and Hugging Face generation, reusable creative recipes, and a public inspiration gallery.

## Stack

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- Three.js and React Three Fiber for the capability-gated landing hero
- Supabase Auth, Postgres, Row Level Security, and private/public Storage
- Drizzle schema and additive SQL migrations
- OpenRouter image and asynchronous video APIs
- Hugging Face Inference Providers with an encrypted system credential pool
- Vercel hosting and Vitest contract/unit tests

Vercel and Supabase can run on their free plans. Model inference is separate: it uses either the platform’s capped OpenRouter key, an authorized Hugging Face system credential, or a user’s explicitly selected personal OpenRouter key. Hugging Face credits and limits belong to the underlying account; creating multiple tokens for one account does not multiply its allowance.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in Supabase plus server-only secrets.
3. Apply migrations in `drizzle/` in numerical order through the Supabase SQL Editor.
4. Run `npm run dev`; the application opens on port 3000.

Never expose the Supabase service-role key, credential-encryption secret, or either OpenRouter key through a `NEXT_PUBLIC_*` variable.

## OpenRouter funding

Verified accounts can choose one of two explicit funding sources:

- **Free daily allowance:** three combined image/video generations per UTC day using the platform key. One OpenRouter-accepted request consumes one slot. The application also limits system-funded acceptance to 30 jobs per UTC day by default.
- **Personal OpenRouter key:** the encrypted user key is used only after an external-cost confirmation. These runs never use a free slot.

The application never switches credentials automatically. A job’s funding source, resolved model, endpoint, capability snapshot, and UTC quota date are fixed when it is reserved. Image and video availability each have independent system-funded and personal-key kill switches, all disabled by default after migration.

The system-funded image catalog includes Recraft V4.1 Flash, Nano Banana 2 Lite, and GPT Image 1 Mini. Recraft is the default text-to-image option; users explicitly select another model when they need reference-image support or a different visual profile. The application never retries a failed request against a different model automatically.

Connect a personal key under **Provider connections**. Validation uses OpenRouter’s non-generating `GET /api/v1/key` endpoint. Keys are AES-GCM encrypted and never returned to the browser.

## Generation lifecycle

Image requests use OpenRouter’s image endpoint, return one base64 output, and are decoded, signature/dimension checked, and copied into owner-private Supabase Storage. Video requests persist the OpenRouter job ID, recover through authenticated polling after navigation or restart, retrieve the completed MP4 through the authenticated content endpoint, validate it, and copy it into private Storage.

The visible lifecycle is submitting, queued/processing, saving, and complete. Existing authored studies remain browser-local and read-only as **Legacy authored study** history; they are not generated output and never enter cloud Assets.

## Hugging Face system pool

Superadmins can add project-owned or explicitly authorized Hugging Face tokens under **Superadmin → Hugging Face system credential pool**. A token is validated through Hugging Face’s non-generating identity endpoint, encrypted with AES-256-GCM, fingerprinted to prevent duplicates, and never displayed again.

System image jobs lease a compatible credential atomically. Selection considers status, model access, priority, concurrency, cooldown, daily local limits, and least-recent use. Authentication failures invalidate a credential, rate limits apply a cooldown, confirmed credit exhaustion removes it from rotation, and an ambiguous submission is never retried. A job makes at most two credential attempts and never silently falls back to OpenRouter.

Hugging Face currently launches image-only with FLUX.1 Schnell and Krea 2 Turbo. Its runs share the same three-per-user UTC allowance as OpenRouter system-funded runs. Provider flags and pool state are disabled or empty after migration, so an administrator must add a token and explicitly enable Hugging Face system images.

OpenRouter does not currently have an enabled webhook path in this release. Polling is the authoritative recovery mechanism. `OPENROUTER_WEBHOOK_SECRET` is reserved for a future signed webhook rollout after the provider contract is confirmed.

## Server environment

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
PROVIDER_KEY_ENCRYPTION_SECRET
ADMIN_EMAIL_ALLOWLIST
OPENROUTER_SYSTEM_API_KEY
OPENROUTER_SYSTEM_DAILY_JOB_LIMIT=30
OPENROUTER_WEBHOOK_SECRET
HUGGINGFACE_SYSTEM_DAILY_JOB_LIMIT=10
SHOWCASE_FEED_ENABLED=true
SHOWCASE_3D_ENABLED=true
```

Use a dedicated platform OpenRouter key with a provider-side spending cap and model restrictions. Use fine-grained Hugging Face tokens with only the access required for inference. Disabling a provider flag stops new submissions immediately without deleting jobs, quota accounting, pool diagnostics, or private media.

## Privacy and sharing

References and generated outputs are owner-private by default. Provider URLs and signed reference URLs remain server-only. Preview URLs expire. Public sharing requires explicit confirmation and publishes a separate output copy; prompts and references are not published. A public link remains unlisted unless its owner separately opts into Explore with an approved public title, category, and accessibility description. Revocation removes that public copy but cannot retract copies already downloaded or cached.

## Verification

After the database migration is applied, run the focused provider/quota tests, service tests, full suite, TypeScript, ESLint, formatting check, and production webpack build in the order documented in the active workbook. Live paid smoke tests are always manual and opt-in.

Delivery decisions and evidence live in [tasks.md](tasks.md) and [task-workbooks/](task-workbooks/). Agent capture records remain under `.agent-logs/`.
