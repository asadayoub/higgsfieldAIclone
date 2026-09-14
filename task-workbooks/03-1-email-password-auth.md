# T03.1 — Email/Password Authentication and Account Recovery

Status: **Complete — implemented and verified**

## Objective

Make email/password the primary account entry path so returning users can sign in without consuming an authentication email, while retaining magic links as an optional recovery-friendly fallback.

## Dependencies

- T03 Supabase sessions, profile bootstrap, protected routes, and role authorization.
- The existing response-bound cookie handling in the auth callback and session proxy.

## Product decisions

- `/account` defaults to sign in and offers an explicit signup mode.
- Passwords require 10–72 characters with uppercase, lowercase, and numeric characters.
- Signup and recovery responses do not reveal whether an email already exists.
- Email verification remains enabled. Signup confirmation and password recovery return through the existing PKCE callback.
- Magic-link access remains available behind an optional secondary action.
- Successful password sign-in creates or repairs the profile through the same allowlist-only role bootstrap used by magic links.
- Recovery links land on `/account/update-password`; the password mutation requires a valid authenticated recovery session.

## Planned deliverables

- Server actions for signup, password sign-in, password recovery, password update, and confirmation resend.
- Shared email/password validation with focused unit coverage.
- A unified account card with sign-in/signup switching, password visibility controls, pending states, and accessible errors.
- Dedicated recovery-request and update-password screens.
- Safe internal return routing across sign-in, signup verification, and recovery.
- Continued support for the existing magic-link flow.

## Security requirements

- Passwords are submitted only to server actions and Supabase Auth; they are never logged, stored in application tables, or returned to the browser.
- All input is validated server-side and response payloads contain only presentation-safe status text.
- Login and recovery failures use neutral copy where account enumeration is possible.
- Password-update actions require a verified Supabase session and never accept a user identifier from the form.
- Redirect targets are constrained by `safeReturnPath`.

## Affected files

- `src/app/auth/actions.ts`
- `src/app/account/page.tsx`
- `src/app/account/recover/page.tsx`
- `src/app/account/update-password/page.tsx`
- `src/components/auth/account-access-form.tsx`
- `src/components/auth/magic-link-form.tsx`
- `src/components/auth/password-field.tsx`
- `src/server/auth/credentials.ts`
- `tests/auth.test.ts`
- `tasks.md`

## Acceptance criteria

- A confirmed user can sign in repeatedly with email/password without an email being sent.
- A new user can submit signup and receives a verification-required state without account enumeration.
- Invalid credentials, duplicate signup, weak passwords, and confirmation mismatch have accessible, safe feedback.
- Recovery always returns a neutral success state; a valid recovery session can set a new password.
- Successful sign-in preserves the intended internal destination and existing tester/superadmin authorization.
- Magic-link sign-in remains functional as a secondary option.

## Verification

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Browser checks cover sign-in/signup switching, validation, invalid credentials, recovery request, update-password denial without a session, successful password sign-in, return routing, and mobile keyboard behavior.

## Rollback

The existing magic-link form and callback remain intact. If password auth must be disabled, the account page can render only the magic-link path without schema or data rollback.

## Implementation record

Completed on 2026-09-14.

- Made password sign-in the default `/account` experience and added an explicit account-creation mode.
- Added server-side signup, sign-in, recovery, confirmation-resend, and password-update actions with neutral account-discovery responses.
- Added shared email normalization and 10–72 character password validation requiring uppercase, lowercase, and numeric characters.
- Added accessible password visibility controls, pending states, validation feedback, verification guidance, and an optional collapsed magic-link fallback.
- Added `/account/recover` and session-protected `/account/update-password` screens.
- Preserved safe return routing, allowlist-only superadmin bootstrap, and the existing Supabase PKCE callback.
- Verified invalid credentials return neutral feedback and an unauthenticated password-update visit exposes no form.
- Created one temporary confirmed Supabase tester for the live password smoke test. Password sign-in returned to `/history`, the tester was redirected from `/admin` to `/forbidden`, and sign-out returned to `/`. The exact temporary Auth user and cascading profile were deleted immediately afterward.

Verification passed:

```text
npm run format:check
npm run lint
npm run typecheck
npm test          # 5 files, 15 tests
npm run build     # 17 routes plus Proxy
```

Signup verification, confirmation resend, and password recovery still require outbound email. Routine password sign-in does not, which removes the email quota from normal returning-user access.
