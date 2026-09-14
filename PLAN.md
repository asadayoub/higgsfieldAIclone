# Build Plan

## Product decision

Build one unusually polished, evaluator-friendly product loop rather than a shallow clone of every Higgsfield studio:

**Explore → Creation detail → Recreate → Studio configuration → Simulated generation → Result → History**

The experience works without authentication, payment, or API keys. It is explicitly an unofficial technical-assignment rebuild.

## Full production stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js App Router + React + TypeScript | First-class Vercel deployment, server rendering, route handlers, typed UI |
| Styling | Tailwind CSS | Fast responsive iteration and a small consistent design token surface |
| Motion | Motion for React | Polished modal, gallery, job, and route-state transitions |
| Icons | Lucide React | Consistent lightweight iconography |
| UI primitives | Radix primitives where needed | Accessible dialogs, tooltips, tabs, and focus management without a generic component-library look |
| Validation | Zod | Shared validation for browser forms and server endpoints |
| Database | Neon Serverless Postgres (Free) | Durable generation history, scales to zero, Vercel-friendly connection model |
| ORM/migrations | Drizzle ORM + Drizzle Kit | Small runtime, typed schema, SQL transparency |
| Hosting | Vercel Hobby (Free) | Git-based deploys, HTTPS, preview deployments, Next.js-native runtime |
| Static media | Versioned assets in `public/` | No protected hotlinks, no object-storage account, deterministic demo |
| Reference uploads | Browser object URLs only | Instant previews; no collection of evaluator files or storage costs |
| Tests | Vitest + Testing Library + Playwright | Unit/component confidence plus the full evaluator journey at target breakpoints |
| CI/CD | GitHub + Vercel Git integration | Public source and automatic deployments from the main branch |

### Free-tier fit

- Vercel Hobby is appropriate for this personal technical assignment. It includes automatic HTTPS and enough request/build capacity for an evaluator demo. It is not the right long-term tier for a commercial production workload.
- Neon Free supplies serverless Postgres with scale-to-zero behavior and enough storage/compute for generation metadata. No media blobs are stored in Postgres.
- A database is an enhancement, not a single point of failure: when `DATABASE_URL` is absent, the app uses browser persistence and the complete demo remains functional.
- The zero-key generator selects an original curated output deterministically from mode, prompt, model, and preset after realistic job transitions. The README will state this plainly.

## Technical architecture

### Rendering split

- Server components render the shell, initial Explore catalog, metadata, and detail routes.
- Client islands own search/filter state, modal focus, studio controls, upload previews, progress animation, toasts, and optimistic history.
- Route handlers validate generation requests, create/update server-backed history when Neon is configured, and return deterministic simulated jobs.
- A generated anonymous device identifier is stored in an HTTP-only cookie and represented by a one-way owner hash in the database.

### Persistence strategy

1. Save a generation immediately to local storage as `queued` for instant feedback.
2. POST the validated configuration to the generation endpoint.
3. Advance through `queued → processing → complete` (or a deliberate test failure).
4. Persist only metadata and the internal result asset path to Neon.
5. Merge database and local history by generation ID, so reloads remain robust even if the free database is sleeping or unconfigured.

### Security and privacy

- No provider API key in browser bundles.
- Server-only `DATABASE_URL`.
- Zod limits prompt length, enum values, and generated IDs.
- Parameterized Drizzle queries only.
- Anonymous histories are scoped by a random cookie-derived owner hash.
- Uploaded references never leave the browser in the fallback implementation.
- No remote user-provided URLs are rendered.

## Route structure

```text
/                         Explore gallery
/creation/[slug]          Shareable creation detail
/studio                   Image/video studio; accepts recreate query state
/result/[id]              Completed/failed generation result
/history                  Persistent anonymous generation library
/api/generations          Create/list generation records
/api/generations/[id]     Read/update one generation job
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
  ownerId: string;
  sourceCreationSlug?: string;
  mode: "image" | "video";
  prompt: string;
  modelId: string;
  presetId?: string;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
  durationSeconds?: 5 | 10;
  status: "queued" | "processing" | "complete" | "failed";
  progress: number;
  resultAsset: string;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
};
```

Reference files are represented only by browser-local preview metadata and are intentionally excluded from the database.

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
- Add database schema with a no-database fallback.

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

- Real paid AI generation and provider billing.
- Account creation/authentication.
- Social posting, comments, follows, and creator profiles.
- Audio generation, Canvas, Cinema Studio, Marketing Studio, full project authoring, and collaborative folders.
- Permanent uploaded-reference storage.
- Exact reproduction of Higgsfield branding or protected media.

## Risks and fallbacks

| Risk | Mitigation |
| --- | --- |
| Neon project or credentials are unavailable at deploy time | Local-storage adapter keeps the full journey working; `DATABASE_URL` is optional |
| Free database cold start | Optimistic local history renders first and syncs in the background |
| Large media harms page performance | Locally optimized WebP/AVIF assets, explicit dimensions, lazy loading, limited above-fold preload |
| A simulated generator feels fake | Realistic staged timing, honest label, prompt/config-derived deterministic result, metadata, failure/retry path |
| Scope pressure | Protect the complete vertical slice; omit social breadth and extra studios |
| Mobile composer becomes crowded | Full-screen mobile studio with sticky Generate action and collapsible advanced controls |
| Vercel Hobby constraints | Keep route handlers short, avoid long-running functions, and simulate progress in the browser |

## Deployment checklist

- Create free Neon project and run Drizzle migrations.
- Add `DATABASE_URL` to Vercel only; never commit it.
- Import the public GitHub repository into Vercel.
- Confirm production HTTPS route in a private browser session.
- Confirm the app works with and without `DATABASE_URL`.
- Confirm `.agent-logs/` is present in the public repository.
- Record a camera-on walkthrough under five minutes.

