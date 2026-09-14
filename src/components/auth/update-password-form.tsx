"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { updatePassword, type AuthFormState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { PasswordField } from "./password-field";

const initialState: AuthFormState = { status: "idle" };

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={action} className="mt-7 space-y-4">
      <PasswordField
        name="password"
        label="New password"
        autoComplete="new-password"
        hint="Use 10–72 characters with uppercase, lowercase, and a number."
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
      />
      <Button
        type="submit"
        variant="primary"
        disabled={pending}
        className="w-full"
      >
        <ShieldCheck size={16} aria-hidden="true" />
        {pending ? "Updating password…" : "Update password"}
      </Button>
      {state.message ? (
        <p role="alert" className="text-sm leading-6 text-[var(--danger)]">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
