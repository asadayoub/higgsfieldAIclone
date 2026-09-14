"use client";

import { useActionState } from "react";
import { CheckCircle2, KeyRound, Shield, Trash2 } from "lucide-react";
import {
  connectProvider,
  deleteProviderConnection,
  type ProviderConnectionState,
} from "@/app/settings/providers/actions";
import { Button } from "@/components/ui/button";
import type { ProviderConnectionSummary } from "@/server/providers/connections";
import type { ConnectableProviderId } from "@/server/providers/validation";

const initialState: ProviderConnectionState = { status: "idle" };

type ProviderConnectionCardProps = {
  provider: {
    id: ConnectableProviderId;
    name: string;
    description: string;
    media: string;
    keyHint: string;
  };
  connection?: ProviderConnectionSummary | undefined;
  generationEnabled: boolean;
};

export function ProviderConnectionCard({
  provider,
  connection,
  generationEnabled,
}: ProviderConnectionCardProps) {
  const [state, action, pending] = useActionState(
    connectProvider,
    initialState,
  );

  return (
    <article className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/6 text-[var(--action)]">
            <KeyRound size={19} aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{provider.name}</h2>
              <span className="rounded-full bg-white/6 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                {provider.media}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
              {provider.description}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            connection?.isValid
              ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
              : "bg-white/6 text-[var(--text-muted)]"
          }`}
        >
          {connection?.isValid ? "Verified" : "Not connected"}
        </span>
      </div>

      {connection ? (
        <div className="mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-white/2 p-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] tracking-wide text-[var(--text-faint)] uppercase">
              Connection
            </p>
            <p className="mt-1 truncate text-sm font-medium">
              {connection.label}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-wide text-[var(--text-faint)] uppercase">
              Credential
            </p>
            <p className="mt-1 font-mono text-sm">•••• {connection.lastFour}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-wide text-[var(--text-faint)] uppercase">
              Live generation
            </p>
            <p className="mt-1 text-sm font-medium">
              {generationEnabled ? "Enabled" : "Admin disabled"}
            </p>
          </div>
          <p className="text-xs leading-5 text-[var(--text-faint)] sm:col-span-3">
            {connection.accountLabel ?? provider.name} · fingerprint{" "}
            {connection.fingerprint}
          </p>
        </div>
      ) : null}

      <form
        action={action}
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.3fr_auto]"
      >
        <input type="hidden" name="provider" value={provider.id} />
        <label>
          <span className="sr-only">Connection label</span>
          <input
            name="label"
            required
            minLength={2}
            maxLength={80}
            defaultValue={connection?.label ?? `${provider.name} workspace`}
            placeholder="Connection label"
            className="min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--control)] px-4 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus)]"
          />
        </label>
        <label>
          <span className="sr-only">{provider.name} API key</span>
          <input
            name="secret"
            type="password"
            autoComplete="off"
            required
            minLength={8}
            maxLength={4096}
            placeholder={connection ? "Enter key to replace" : provider.keyHint}
            className="min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--control)] px-4 font-mono text-sm outline-none placeholder:font-sans placeholder:text-[var(--text-faint)] focus:border-[var(--focus)]"
          />
        </label>
        <Button type="submit" variant="primary" disabled={pending}>
          <CheckCircle2 size={16} aria-hidden="true" />
          {pending
            ? "Verifying…"
            : connection
              ? "Verify & replace"
              : "Verify & connect"}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs leading-5 text-[var(--text-faint)]">
          <Shield size={14} aria-hidden="true" />
          Encrypted before storage. The original key is never returned.
        </p>
        {connection ? (
          <form
            action={deleteProviderConnection}
            onSubmit={(event) => {
              if (!window.confirm(`Remove the ${provider.name} connection?`))
                event.preventDefault();
            }}
          >
            <input type="hidden" name="connectionId" value={connection.id} />
            <Button type="submit" size="sm" variant="ghost">
              <Trash2 size={14} aria-hidden="true" />
              Remove
            </Button>
          </form>
        ) : null}
      </div>
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-4 text-sm ${
            state.status === "error"
              ? "text-[var(--danger)]"
              : "text-[var(--success)]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </article>
  );
}
