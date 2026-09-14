# T03 — Authentication, Authorization, and Superadmin

Status: **Draft plan — refine before implementation**

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
