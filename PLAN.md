# Build Plan

## Product decision

Build one unusually polished product loop first, then expand the platform through stable provider and workflow contracts:

**Explore → Creation detail → Recreate → Studio configuration → Generation → Result → History**

The core browsing and guided experience works without authentication, payment, or API keys. Authenticated testers can connect supported model providers and run real generation workflows. The platform has its own product identity while drawing product-design lessons from the researched creative tools.

## Full production stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js App Router + React + TypeScript | First-class Vercel deployment, server rendering, route handlers, typed UI |
| Styling | Tailwind CSS | Fast responsive iteration and a small consistent design token surface |
| Motion | Motion for React | Polished modal, gallery, job, and route-state transitions |
| Icons | Lucide React | Consistent lightweight iconography |
| UI primitives | Radix primitives where needed | Accessible dialogs, tooltips, tabs, and focus management without a generic component-library look |
| Validation | Zod | Shared validation for browser forms and server endpoints |
| Platform backend | Supabase Free | Postgres, Auth, row-level security, and public/private Storage in one service |
| ORM/migrations | Drizzle ORM + SQL migrations | Typed server queries and reviewable, additive schema evolution |
| Hosting | Vercel Hobby (Free) | Git-based deploys, HTTPS, preview deployments, Next.js-native runtime |
| Static media | Versioned product assets + Supabase Storage | Deterministic curated media, no protected hotlinks, durable generated outputs |
| Reference uploads | Browser previews + private Supabase Storage | Instant previews with authenticated, access-controlled persistence for real workflows |
| Tests | Vitest + Testing Library + Playwright | Unit/component confidence plus the complete product journey at target breakpoints |
| CI/CD | GitHub + Vercel Git integration | Public source and automatic deployments from the main branch |

### Free-tier fit

- Vercel Hobby supports the initial product launch with automatic HTTPS and Git-based delivery. A commercial launch will require moving to a paid plan that permits the intended usage and traffic profile.
- Supabase Free supplies Postgres, authentication, and object storage for the initial product. Generated media is stored in Storage rather than database rows.
- The guided mode selects an original curated output deterministically from mode, prompt, model, and preset after realistic job transitions. Live mode uses an authenticated provider connection.
- Private generations and source references are private by default; only deliberately published showcase media is stored in the public bucket.

## Technical architecture

### Rendering split

- Server components render the shell, initial Explore catalog, metadata, and detail routes.
- Client islands own search/filter state, modal focus, studio controls, upload previews, progress animation, toasts, and optimistic history.
- Route handlers validate generation requests, enforce role and ownership checks, submit provider jobs, and synchronize generation state.
- Supabase Auth identifies signed-in users; anonymous guided sessions use a random HTTP-only device identifier.
- Provider credentials are encrypted server-side with AES-256-GCM before persistence and are never returned to the browser after saving.

### Persistence strategy

1. Create a generation row as `queued` and return it optimistically to the client.
2. Guided mode advances through the same job contract using curated local outputs.
3. Live mode decrypts the selected provider credential only inside the server request and submits the provider job.
4. Polling or provider webhooks advance `queued → processing → complete/failed`.
5. Completed private media is copied into the owner-scoped private bucket; published showcase media is copied into the public bucket.
6. The browser caches recent metadata for fast startup but Supabase remains the source of truth for authenticated history.

### Security and privacy

- No provider API key in browser bundles.
- Server-only Supabase service credentials and encryption master key.
- Zod limits prompt length, enum values, and generated IDs.
- Parameterized Drizzle queries only.
- Anonymous guided histories are scoped by a random cookie-derived owner hash.
- Authenticated references use owner-scoped private storage paths and signed URLs.
- Provider credentials are encrypted at rest and redacted in all logs.
- No remote user-provided URLs are rendered.

## Route structure

```text
/                         Explore gallery
/creation/[slug]          Shareable creation detail
/studio                   Image/video studio; accepts recreate query state
/result/[id]              Completed/failed generation result
/history                  Persistent anonymous generation library
/admin                    Superadmin operations and platform health
/settings/providers       Authenticated provider-key management
/api/generations          Create/list generation records
/api/generations/[id]     Read/poll one generation job
/api/providers            Store/list redacted provider connections
/api/webhooks/[provider]  Verify provider webhook and update jobs
```

On large screens, creation detail will also open as a modal from Explore while retaining a shareable canonical route. On mobile it becomes a full-screen sheet/page.

## Component structure

```text
AppShell
├── BrandMark
├── DesktopNav / MobileNav
└── CommandSearch

ExplorePage
├── ExploreHero
├── SearchAndFilters
├── MediaMasonry
│   └── CreationCard
└── CreationDetailDialog

StudioPage
├── ModeSwitch
├── ReferenceUploader
├── PromptComposer
├── ModelPicker
├── PresetPicker
├── AspectRatioPicker
├── VideoOptions
└── GenerationStage
    ├── QueuedState
    ├── ProcessingState
    ├── FailureState
    └── ResultCard

HistoryPage
├── HistoryFilters
├── HistoryGrid
└── EmptyState
```

## Data model

### `Generation`

```ts
type Generation = {
  id: string;
  ownerId?: string;
  sourceCreationSlug?: string;
  mode: "image" | "video";
  prompt: string;
  modelId: string;
  presetId?: string;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
  durationSeconds?: 5 | 10;
  status: "queued" | "processing" | "complete" | "failed";
  progress: number;
  providerConnectionId?: string;
  storageVisibility: "public" | "private";
  resultAsset: string;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
};
```

Reference files are previewed locally first. Guided-mode references stay browser-local; authenticated live-mode references are uploaded to owner-scoped private storage paths.

### Static catalog entities

- `Creation`: slug, title, author, prompt, media type, local asset, category, model, preset, ratio, palette, and engagement display values.
- `Model`: ID, title, mode, description, speed/quality labels, supported ratios, and featured flag.
- `Preset`: ID, title, mode, preview, description, and default model.

## Milestones

### Milestone 0 — reconnaissance and architecture (complete)

- Verify automatic capture.
- Inspect live navigation, community, creation, image, video, effects, and assets flows.
- Save useful screenshots and document product decisions.

### Milestone 1 — foundation and original media kit (60–90 minutes)

- Scaffold Next.js, TypeScript, Tailwind, linting, and test tooling.
- Establish design tokens, fonts, responsive shell, local catalog, and original artwork.
- Add database, authentication, storage, role, and provider-credential foundations.

### Milestone 2 — Explore and creation detail (90 minutes)

- Cinematic hero, masonry gallery, skeletons, search, and category/media filters.
- Hover actions, keyboard navigation, detail modal/page, and responsive behavior.

### Milestone 3 — recreate and generation studio (90–120 minutes)

- Prefill studio from a selected creation.
- Image/video mode, prompt, model/preset, ratios, reference preview, validation.
- Queued/processing/failure/success state machine.

### Milestone 4 — results and history (60 minutes)

- Result route and metadata/actions.
- Local + Neon persistence, history filtering, empty state, favorite/remove controls.
- Graceful free-database cold start and offline fallback.

### Milestone 5 — verification and delivery (60–90 minutes)

- Visual QA at 1440px, 1024px, and 390px.
- Keyboard/focus pass, console pass, failure-path tests.
- Format, lint, type-check, unit tests, end-to-end test, and production build.
- README, screenshots, Vercel configuration, public deployment, and final link checks.

## Explicitly out of scope

- Platform-managed AI credits and provider billing.
- Social posting, comments, follows, and creator profiles.
- Audio generation, Canvas, Cinema Studio, Marketing Studio, full project authoring, and collaborative folders.
- Public sharing of private source references.
- Exact reproduction of Higgsfield branding or protected media.

## Risks and fallbacks

| Risk | Mitigation |
| --- | --- |
| Supabase project or credentials are unavailable at deploy time | Guided mode stays available; authenticated persistence and live providers report a clear unavailable state |
| Free database cold start | Optimistic recent-history cache renders first and syncs in the background |
| Large media harms page performance | Locally optimized WebP/AVIF assets, explicit dimensions, lazy loading, limited above-fold preload |
| Guided generation is mistaken for a live provider | Persistent mode badge, explicit result provenance, and separate provider connection workflow |
| Scope pressure | Protect the complete vertical slice; omit social breadth and extra studios |
| Mobile composer becomes crowded | Full-screen mobile studio with sticky Generate action and collapsible advanced controls |
| Vercel Hobby constraints | Keep route handlers short and use submit/poll or verified webhooks for long-running provider jobs |

## Deployment checklist

- Create the Supabase project, public/private Storage buckets, Auth configuration, and additive migrations.
- Add Supabase server credentials and `PROVIDER_KEY_ENCRYPTION_SECRET` to Vercel only; never commit them.
- Import the public GitHub repository into Vercel.
- Confirm production HTTPS route in a private browser session.
- Confirm guided mode works without a provider key and live mode works with a tester-owned provider key.
- Confirm `.agent-logs/` is present in the public repository.
- Record a camera-on walkthrough under five minutes.
