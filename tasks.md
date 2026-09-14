# Product Delivery Tasks

This file is the execution index for the creative AI platform. Work proceeds in dependency order. Every task has a workbook under [`task-workbooks/`](task-workbooks/) and must pass its planning gate before implementation begins.

## Working rules

- Only one product task is actively implemented at a time unless two items are explicitly proven independent.
- Before implementation, update the task workbook with final decisions, affected files, validation commands, and rollback notes.
- A task is complete only when its acceptance criteria and verification checklist pass.
- Product research may continue at any point. When behavior or visual hierarchy is uncertain, validate it in the live reference product and add the finding to the active workbook.
- Architecture decisions that affect later work are recorded in the first workbook and reflected in `PLAN.md`.
- Captured agent logs remain append-only and are committed with the work they describe.

## Status legend

- `[ ]` Not started
- `[~]` Planned or in progress
- `[x]` Complete and verified
- `[!]` Blocked with the blocker recorded in the workbook

## Delivery sequence

- [~] **T01 — Architecture, foundation, and asset system**  
  Define the production architecture, product boundaries, role model, storage rules, provider contract, repository foundation, and original asset kit before feature work.  
  Workbook: [`task-workbooks/01-architecture-foundation-assets.md`](task-workbooks/01-architecture-foundation-assets.md)

- [ ] **T02 — Design system and responsive application shell**  
  Establish visual tokens, typography, navigation, layout primitives, accessibility foundations, and global feedback components.  
  Workbook: [`task-workbooks/02-design-system-app-shell.md`](task-workbooks/02-design-system-app-shell.md)

- [ ] **T03 — Authentication, authorization, and superadmin**  
  Add Supabase Auth, visitor/tester/superadmin roles, protected routes, session handling, and administrative controls.  
  Workbook: [`task-workbooks/03-auth-superadmin.md`](task-workbooks/03-auth-superadmin.md)

- [ ] **T04 — Database, storage, and secure provider connections**  
  Implement the Postgres schema, row-level security, public/private Storage buckets, encrypted BYOK credentials, and provider capability registry.  
  Workbook: [`task-workbooks/04-data-storage-provider-keys.md`](task-workbooks/04-data-storage-provider-keys.md)

- [ ] **T05 — Explore and discovery experience**  
  Build the cinematic, searchable, filterable media gallery with strong loading, empty, error, hover, and mobile states.  
  Workbook: [`task-workbooks/05-explore-discovery.md`](task-workbooks/05-explore-discovery.md)

- [ ] **T06 — Creation detail and recreate journey**  
  Build shareable creation details and carry an inspected creation’s prompt, model, preset, ratio, and mode into the studio.  
  Workbook: [`task-workbooks/06-creation-detail-recreate.md`](task-workbooks/06-creation-detail-recreate.md)

- [ ] **T07 — Generation studio and reference inputs**  
  Build Image and Video studio modes, model/preset controls, reference upload, validation, responsive layouts, and submit confirmation.  
  Workbook: [`task-workbooks/07-generation-studio.md`](task-workbooks/07-generation-studio.md)

- [ ] **T08 — Guided and live generation orchestration**  
  Implement one job contract for guided outputs and real provider adapters, including asynchronous status, webhooks/polling, failure, cancellation, and retry.  
  Workbook: [`task-workbooks/08-generation-orchestration.md`](task-workbooks/08-generation-orchestration.md)

- [ ] **T09 — Results, history, and asset library**  
  Build result actions, provenance, private/public visibility, persistent history, favorites, filters, signed media access, and empty states.  
  Workbook: [`task-workbooks/09-results-history-library.md`](task-workbooks/09-results-history-library.md)

- [ ] **T10 — Quality, security, deployment, and launch**  
  Complete responsive and accessibility QA, security review, automated tests, performance work, documentation, Vercel/Supabase deployment, and public smoke tests.  
  Workbook: [`task-workbooks/10-quality-deployment-launch.md`](task-workbooks/10-quality-deployment-launch.md)

## Cross-cutting release criteria

- A visitor can explore, inspect, recreate, run guided generation, view a result, and revisit local history without signing in.
- An authenticated tester can add a supported provider key, confirm a real generation, and retrieve the private result without exposing the credential or storage object.
- A superadmin can inspect provider health, enable or disable live providers, manage tester access, and view sanitized job diagnostics.
- Private references and results cannot be accessed by another user or through a raw public URL.
- Public showcase media is explicitly published and contains no private source asset.
- The complete journey passes at 1440px, 1024px, and 390px with keyboard-only navigation.
- The production build, lint, type check, unit tests, and end-to-end smoke suite pass.
- The production URL works in a signed-out private browser session.

