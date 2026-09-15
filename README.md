# LumaForge

A creative workspace for exploring visual directions, editing image/video recipes, running free authored studies, and generating private media with your own provider credentials.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase Auth/Postgres/Storage, Drizzle schema/migrations, and Vitest. Designed for Vercel and Supabase free-tier hosting. Model execution is billed separately by the connected provider.

## Local development

Install dependencies with `npm install`, copy `.env.example` to `.env.local`, configure Supabase, and run `npm run dev`. The app opens on port 3000. Guided studies work without a provider key.

Apply the SQL migrations under `drizzle/` in numerical order to your Supabase project. They establish authentication, roles, private storage, encrypted credentials, and server-owned generation mutations. Do not expose the service-role key to the browser.

## Bring your own key

1. Configure `PROVIDER_KEY_ENCRYPTION_SECRET` with a securely generated 32-byte hex secret (64 hexadecimal characters). Keep it server-only and stable; changing it without rotating stored credentials makes existing connections unreadable. Configure the same secret in Vercel. Missing encryption configuration intentionally prevents key storage.
2. Sign in and connect an OpenAI or Replicate key under **Provider connections**. Account validation does not guarantee access to every model or available billing balance.
3. A superadmin enables the desired provider/media under **Superadmin → Live provider availability**. New live submissions are disabled by default.
4. Choose **Live · your key** in Studio, select the model, upload any selected references privately, and review the paid-run confirmation.

Supported backend workflows: OpenAI `gpt-image-2` text-to-image; Replicate `black-forest-labs/flux-2-pro` text/reference-to-image; Replicate `minimax/video-01` six-second text/reference-to-video. Live runs produce one output. OpenAI starts with text-only input; video is 720p, with provider-determined reference framing. Replicate forwards Hailuo inputs to MiniMax.

The adapters are verified against mocked contracts, not live paid API calls. Actual execution depends on provider availability, account model access, billing, rate limits, and deployed runtime configuration.

## Execution and privacy

Replicate jobs use asynchronous submission and authenticated polling. Job identities, provider IDs, configuration, and sanitized events persist in Postgres, so reopening a result resumes retrieval without resubmission. Provider output URLs stay server-side and are copied into private Storage. Signed preview URLs expire after ten minutes; results refresh access automatically.

OpenAI image generation is synchronous with a 240-second request timeout and a 300-second route budget. Enable Vercel Fluid compute: [Hobby supports a 300-second function budget with Fluid compute](https://vercel.com/docs/functions/configuring-functions/duration), but legacy Hobby functions are limited to 60 seconds. An interrupted/ambiguous submission is never automatically repeated: inspect the provider dashboard before confirming a new paid run. OpenAI requests cannot be cancelled from this app.

Free guided runs deterministically select original authored SVG studies. They do not execute an AI model or transform references/settings into new pixels; video studies are motion posters, not clips. The latest 50 guided runs and their favorites remain browser-local. Private cloud records and credentials are never saved into that history.

Public sharing requires explicit confirmation and publishes a copy of the completed output only. Prompts and references remain private. Revocation removes the public copy and disables its share page; it cannot retract downloaded or cached copies.

## Quality checks

`npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Where the local Turbopack build worker cannot bind in the sandbox, `npx next build --webpack` provides a supported production check. Stop the development server before building into the same `.next` directory.

Delivery decisions and verification evidence live in [tasks.md](tasks.md) and [task-workbooks/](task-workbooks/). Agent capture records are committed incrementally under `.agent-logs/`.
