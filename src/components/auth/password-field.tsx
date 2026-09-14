"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  hint?: string | undefined;
};

export function PasswordField({
  name,
  label,
  autoComplete,
  hint,
}: PasswordFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [visible, setVisible] = useState(false);

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-xs font-medium text-[var(--text-muted)]">
        {label}
      </span>
      <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--control)] px-4 focus-within:border-[var(--focus)]">
        <LockKeyhole
          size={17}
          className="shrink-0 text-[var(--text-faint)]"
          aria-hidden="true"
        />
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === "new-password" ? 10 : undefined}
          maxLength={72}
          aria-describedby={hint ? hintId : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--text-faint)] hover:bg-white/7 hover:text-[var(--text)]"
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
      {hint ? (
        <span
          id={hintId}
          className="mt-2 block text-xs leading-5 text-[var(--text-faint)]"
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}
