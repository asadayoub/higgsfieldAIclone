"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Mail, UserPlus } from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
  resendSignupConfirmation,
  type AuthFormState,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { PasswordField } from "./password-field";

const initialState: AuthFormState = { status: "idle" };

function destinationQuery(next: string) {
  return next === "/assets" ? "" : `&next=${encodeURIComponent(next)}`;
}

export function AccountAccessForm({
  mode,
  next,
}: {
  mode: "signin" | "signup";
  next: string;
}) {
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithPassword,
    initialState,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendSignupConfirmation,
    initialState,
  );
  const signingUp = mode === "signup";
  const state = signingUp ? signUpState : signInState;
  const pending = signingUp ? signUpPending : signInPending;

  return (
    <div className="mt-7">
      <nav
        aria-label="Account access"
        className="grid grid-cols-2 rounded-2xl bg-[var(--control)] p-1"
      >
        <Link
          href={`/account?mode=signin${destinationQuery(next)}`}
          aria-current={!signingUp ? "page" : undefined}
          className={`rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
            !signingUp
              ? "bg-white/10 text-[var(--text)]"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          Sign in
        </Link>
        <Link
          href={`/account?mode=signup${destinationQuery(next)}`}
          aria-current={signingUp ? "page" : undefined}
          className={`rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
            signingUp
              ? "bg-white/10 text-[var(--text)]"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          Create account
        </Link>
      </nav>

      <form
        action={signingUp ? signUpAction : signInAction}
        className="mt-6 space-y-4"
      >
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-[var(--text-muted)]">
            Email address
          </span>
          <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--control)] px-4 focus-within:border-[var(--focus)]">
            <Mail
              size={17}
              className="text-[var(--text-faint)]"
              aria-hidden="true"
            />
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
            />
          </span>
        </label>
        <PasswordField
          name="password"
          label="Password"
          autoComplete={signingUp ? "new-password" : "current-password"}
          hint={
            signingUp
              ? "Use 10–72 characters with uppercase, lowercase, and a number."
              : undefined
          }
        />
        {signingUp ? (
          <PasswordField
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
          />
        ) : null}

        {!signingUp ? (
          <div className="flex justify-end">
            <Link
              href="/account/recover"
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Forgot password?
            </Link>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          className="w-full"
        >
          {signingUp ? <UserPlus size={16} /> : <ArrowRight size={16} />}
          {pending
            ? signingUp
              ? "Creating account…"
              : "Signing in…"
            : signingUp
              ? "Create account"
              : "Sign in"}
        </Button>
        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={
              state.status === "error"
                ? "text-sm leading-6 text-[var(--danger)]"
                : "text-sm leading-6 text-[var(--success)]"
            }
          >
            {state.message}
          </p>
        ) : null}
      </form>

      {signingUp ? (
        <details className="mt-5 rounded-2xl border border-[var(--line)] bg-white/2 p-4">
          <summary className="cursor-pointer list-none text-center text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
            Didn’t receive your verification email?
          </summary>
          <form action={resendAction} className="mt-4 space-y-3">
            <label className="block">
              <span className="sr-only">Email awaiting verification</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                aria-label="Email awaiting verification"
                className="min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--control)] px-4 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus)]"
              />
            </label>
            <Button
              type="submit"
              variant="secondary"
              disabled={resendPending}
              className="w-full"
            >
              <Mail size={15} aria-hidden="true" />
              {resendPending ? "Requesting email…" : "Resend verification"}
            </Button>
            {resendState.message ? (
              <p
                role={resendState.status === "error" ? "alert" : "status"}
                className={
                  resendState.status === "error"
                    ? "text-xs leading-5 text-[var(--danger)]"
                    : "text-xs leading-5 text-[var(--success)]"
                }
              >
                {resendState.message}
              </p>
            ) : null}
          </form>
        </details>
      ) : null}
    </div>
  );
}
