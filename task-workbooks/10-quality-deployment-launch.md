# T10 — Quality, Security, Deployment, and Launch

Status: **Draft plan — refine before implementation**

## Objective

Harden the complete product, publish it on the free launch stack, and verify it as a real signed-out and authenticated experience.

## Dependencies

- T01–T09 complete.

## Planned deliverables

- Formatting, lint, strict type checking, unit/integration tests, Playwright end-to-end suite, and production build.
- Responsive visual QA at 1440px, 1024px, and 390px.
- Keyboard, screen-reader semantics, reduced-motion, contrast, console, and network-error passes.
- Security review for authz, RLS, key encryption/redaction, webhook verification, uploads, signed URLs, and common web threats.
- Performance optimization, metadata, sitemap, robots, OG assets, error monitoring hooks, and health endpoint.
- Vercel production deployment and Supabase production configuration.
- Product README, architecture guide, operations guide, environment setup, and incident/recovery notes.

## Acceptance criteria

- All automated checks pass without suppressed errors.
- Signed-out guided journey works in a fresh private browser.
- Authenticated tester live-provider journey works with a test credential.
- Superadmin routes reject non-admin access.
- No secret appears in source, browser bundles, logs, screenshots, or repository history.
- Public/private storage access tests pass in production.
- Production URL uses HTTPS and has no blocking console errors.

## Verification

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Manual production scenarios:

- Signed-out guided journey.
- Signup/login/logout/session expiry.
- Tester adds, validates, uses, and deletes a provider connection.
- Image and video job success/failure/retry.
- Private media access denial and signed access success.
- Superadmin provider-disable and sanitized diagnostics.

## Risks and rollback

- Free-tier quotas can be exhausted. Document quotas, surface unavailable states, and keep guided mode operational.
- A faulty release rolls back through Vercel’s previous production deployment; additive database migrations remain compatible with the prior application version.
