"use client";

import { useActionState } from "react";
import { Mail, Send } from "lucide-react";
import { requestPasswordReset, type AuthFormState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = { status: "idle" };

export function RecoveryForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form action={action} className="mt-7 space-y-4">
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
      <Button
        type="submit"
        variant="primary"
        disabled={pending}
        className="w-full"
      >
        <Send size={16} aria-hidden="true" />
        {pending ? "Sending recovery email…" : "Send recovery email"}
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
  );
}
