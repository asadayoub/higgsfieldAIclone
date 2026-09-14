# T03 — Authentication, Authorization, and Superadmin

Status: **Complete — implemented and verified**

## Objective

Introduce secure user sessions and role-aware product surfaces while keeping the public guided journey frictionless.

## Dependencies

- T01 Supabase client boundaries and role schema.
- T02 shell and protected-route UI patterns.

## Planned deliverables

- Supabase Auth flows and server-side session refresh.
- `profiles` role field with `tester` and `superadmin` authorization policies.
- Protected `/settings/providers`, `/history`, and `/admin` routes.
- Superadmin dashboard for tester access, provider availability, sanitized job health, and feature flags.
- Audit records for role changes and administrative mutations.

## Acceptance criteria

- Visitors can use guided mode without signing in.
- A tester cannot access another tester’s settings, credentials, references, jobs, or media.
- Only a superadmin can assign roles or manage global provider connections.
- Server authorization is checked on every protected read and mutation.
- Redirects preserve the intended return URL safely.

## Verification

- Auth integration tests for visitor/tester/superadmin.
- Direct-route and API authorization tests, not only UI tests.
- Browser tests for login, logout, expired session, forbidden, and return routing.

## Risks

- Bootstrapping the first superadmin must not become a public registration path. Use an explicit allowlisted email or one-time SQL promotion documented for the owner.

## Final implementation plan

### Session model

- Add a Next.js proxy dedicated to refreshing Supabase sessions; page access never trusts cookie presence alone.
- Centralize `requireUser`, `requireRole`, and safe return-path validation in server-only modules.
- Keep Explore and guided Studio public. Protect Assets persistence, provider settings, account history, and all administration routes.

### User flows

- Use Supabase email magic links for the first release to avoid password storage and reduce signup friction.
- Provide explicit signed-out, link-sent, expired-link, signed-in, and sign-out states with safe redirects back to the requested internal route.
- Create the matching `profiles` record with default `tester` role after first successful authentication.

### Superadmin surface

- Add `/admin` with summary cards for tester count, enabled providers, recent sanitized job states, and system configuration health.
- Add server-authorized role management and provider feature flags; administrative mutations write immutable audit records.
- Bootstrap the first superadmin only through a server environment allowlist or direct SQL promotion—never through a public control.

### Data additions

```text
admin_audit_events
provider_feature_flags
```

All migrations remain additive with RLS enabled before access.

### Verification additions

- Unit tests for return-path validation and role guards.
- Direct server tests for visitor, tester, and superadmin denial/allow paths.
- Browser checks for signed-out redirects, magic-link request state, forbidden admin access, and session expiry.

## Rollback

Auth remains an enhancement around the public guided experience. If Supabase is not configured, public routes continue working while protected routes return a clear setup state rather than failing the application.

## Implementation record

Implemented on 2026-09-14.

- Added passwordless email sign-in, callback code exchange, sign-out, session refresh proxy, safe internal return paths, and explicit invalid/expired-link states.
- Added server-only `getSessionUser`, `requireUser`, and `requireRole` guards. Protected server components do not rely on navigation visibility or cookie presence.
- Added protected History and provider-settings routes, a forbidden state, a role-aware account screen, and a server-authorized superadmin dashboard.
- Added an allowlist-only superadmin bootstrap, immutable role-change audit writes, provider feature flags, and self-demotion protection.
- Applied the two rerunnable migrations to the configured Supabase Free project. Read-only API verification returned HTTP 200 for profiles, generation jobs, provider flags, and audit events; all three storage buckets are present.
- Signed-out browser QA confirmed `/history` resolves to `/account?next=%2Fhistory` with no private content flash.

Verification passed:

```text
npm run format:check
npm run lint
npm run typecheck
npm test          # 5 files, 12 tests
npm run build     # 15 routes plus Proxy
```

Live completion verification on 2026-09-14:

- Added the owner-selected identity to the local, gitignored `ADMIN_EMAIL_ALLOWLIST` and completed a real Supabase magic-link exchange.
- Confirmed the Auth user exists, the email is verified, and the matching `profiles` row persists the `superadmin` role.
- Exercised invalid/expired-link recovery, successful return routing to `/assets`, a protected provider-settings request, and the server sign-out action in Chrome.
- Corrected the callback to bind Supabase session cookies and mandatory private/no-store headers directly to the redirect response. The proxy applies the same cache headers when refreshing sessions.
- Re-ran format, lint, type checking, 12 unit/integration tests, and the 15-route production build after the callback correction.

Operational note:

- The Supabase Free built-in mailer is intentionally limited to two auth emails per hour. Production should add a free transactional SMTP provider before broader tester onboarding; this is deployment configuration, not an authorization bypass.
