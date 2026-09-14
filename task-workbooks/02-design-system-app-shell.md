# T02 — Design System and Responsive Application Shell

Status: **Draft plan — refine before implementation**

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

