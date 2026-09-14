# T02 — Design System and Responsive Application Shell

Status: **Complete — implemented and verified**

## Objective

Create the platform’s own dark, cinematic design language and responsive navigation shell without generic dashboard styling.

## Dependencies

- T01 application scaffold, brand assets, tokens, and media manifest.

## Planned deliverables

- Semantic color, spacing, radius, typography, motion, elevation, and focus tokens.
- Desktop global navigation, compact laptop treatment, and mobile drawer/bottom actions.
- Reusable button, chip, field, tooltip, toast, dialog, tabs, skeleton, and media-stage compositions.
- Command/search surface and route-level loading/error boundaries.
- Reduced-motion and high-contrast considerations.

## Acceptance criteria

- Shell works at 1440px, 1024px, and 390px without horizontal overflow.
- All interactive elements have visible keyboard focus and accessible names.
- Primary lime is reserved for high-intent actions.
- Loading/error UI preserves layout and does not shift navigation.
- Product identity is distinct from the researched reference while retaining the media-first interaction principles.

## Verification

- Keyboard-only navigation pass.
- Playwright screenshots at all target widths.
- Automated accessibility scan of shell states.
- Visual comparison against the live reference for hierarchy and density, not pixel copying.

## Risks

- Over-custom animation can harm speed and accessibility; use short transitions and honor reduced motion.
- A full component library is unnecessary; build only primitives required by planned screens.

## Final implementation plan

### Visual tokens

- Promote the foundation colors into semantic variables for page, panel, raised control, border, primary and muted text, lime action, warning, error, success, and focus.
- Establish compact navigation and metadata typography plus a large editorial display scale without adding an external font dependency.
- Define shared radii, hairlines, shadows, blur, content widths, and motion timing in global styles.

### App structure

- Desktop: persistent 64px global navigation with creation/discovery links and right-side search, library, and account entry points.
- Mobile: compact top bar with an accessible drawer and sticky Create action.
- Route shell: consistent main landmark, skip link, focus restoration boundary, and room for route-level loading/error states.
- Global overlays: keyboard-search palette, toast region, tooltip primitive, and modal/dialog foundation.

### Components and files

```text
src/components/shell/app-header.tsx
src/components/shell/mobile-menu.tsx
src/components/shell/search-command.tsx
src/components/ui/button.tsx
src/components/ui/dialog.tsx
src/components/ui/tooltip.tsx
src/components/ui/toast.tsx
src/components/ui/skeleton.tsx
src/app/loading.tsx
src/app/error.tsx
src/app/not-found.tsx
```

### Verification additions

- Component tests for keyboard dismissal, focus return, and menu labeling.
- Browser smoke checks at 1440px, 1024px, and 390px.
- Confirm no horizontal overflow, no hidden focus, and correct reduced-motion behavior.

## Rollback

Keep primitives composable and avoid coupling shell state to feature state, allowing later screens to be removed independently.

## Implementation record

Completed on 2026-09-14.

- Added semantic dark-theme tokens, high-contrast focus treatment, reduced-motion behavior, and reusable Button, Dialog, Tooltip, Toast, and Skeleton primitives.
- Added the persistent desktop header, responsive mobile controls, accessible navigation drawer, skip link, and keyboard search command.
- Added stable loading, error, and not-found routes plus real typed destinations for Studio, Effects, Assets, and Account.
- Browser QA confirmed no horizontal overflow at 390px and 1024px, complete desktop hierarchy at the default 1650px viewport, Escape dismissal, and direct input focus after Ctrl/Command+K.
- Browser QA caught and resolved a conflicting responsive display utility before completion.

Verification passed:

```text
npm run format:check
npm run lint
npm run typecheck
npm test          # 4 files, 9 tests
npm run build     # 10 static routes generated
```
