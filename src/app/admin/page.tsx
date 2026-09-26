import { Activity, ShieldCheck, UsersRound, WandSparkles } from "lucide-react";
import {
  addHuggingFaceSystemCredential,
  changeHuggingFaceCredentialState,
  updateUserRole,
  updateProviderAvailability,
  updateHuggingFaceCredentialPolicy,
  validateHuggingFaceSystemCredential,
} from "./actions";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { readServerEnv } from "@/config/env";
import { systemOpenRouterHealth } from "@/server/providers/validation";
import {
  listRecentHuggingFaceAttempts,
  listSystemCredentials,
} from "@/server/providers/system-credentials";
import { huggingFaceImageCatalog } from "@/server/providers/huggingface-catalog";

export default async function AdminPage() {
  await requireRole("superadmin", "/admin");
  const [systemHealth, systemCredentials, huggingFaceAttempts] =
    await Promise.all([
      systemOpenRouterHealth(),
      listSystemCredentials().catch(() => []),
      listRecentHuggingFaceAttempts().catch(() => []),
    ]);
  const supabase = await createSupabaseServerClient();
  const [
    { data: profiles },
    { data: flags },
    { count: jobCount },
    { data: recentJobs },
    { data: events },
  ] = supabase
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, role, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("provider_feature_flags")
          .select(
            "provider, system_image_enabled, system_video_enabled, personal_image_enabled, personal_video_enabled, maintenance_message",
          )
          .in("provider", ["openrouter", "huggingface"])
          .order("provider"),
        supabase
          .from("generation_jobs")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("generation_jobs")
          .select(
            "id,status,media_type,funding_source,resolved_model,actual_cost_usd,reconciliation_code,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("generation_events")
          .select("generation_id,status,error_code,created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ])
    : [{ data: [] }, { data: [] }, { count: 0 }, { data: [] }, { data: [] }];
  const testers =
    profiles?.filter((profile) => profile.role === "tester").length ?? 0;
  const enabled = (flags ?? [])
    .flatMap((flag) => [
      flag.system_image_enabled,
      flag.system_video_enabled,
      flag.personal_image_enabled,
      flag.personal_video_enabled,
    ])
    .filter(Boolean).length;
  const healthyCredentials = systemCredentials.filter(
    (credential) => credential.status === "active",
  ).length;
  const systemKeyConfigured = Boolean(
    readServerEnv().OPENROUTER_SYSTEM_API_KEY,
  );
  const cards = [
    { label: "Tester accounts", value: testers, icon: UsersRound },
    { label: "Enabled workflows", value: enabled, icon: WandSparkles },
    { label: "Generation jobs", value: jobCount ?? 0, icon: Activity },
    {
      label: "Healthy HF tokens",
      value: healthyCredentials,
      icon: ShieldCheck,
    },
  ];
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-5 py-12 lg:px-8">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[var(--action)] text-[var(--action-ink)]">
          <ShieldCheck size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
            Restricted workspace
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.05em]">
            Superadmin
          </h1>
        </div>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"
          >
            <Icon
              size={17}
              className="text-[var(--text-faint)]"
              aria-hidden="true"
            />
            <p className="mt-8 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
          </article>
        ))}
      </div>
      <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="font-semibold">Live provider availability</h2>
        <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
          Four independent kill switches control platform-funded and
          personal-key media. Saving settings never submits a generation.
          Existing jobs can still be retrieved when new submissions are
          disabled.
        </p>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          System key: {systemKeyConfigured ? systemHealth : "unavailable"} ·
          Server-only health never exposes key metadata or account balances.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {flags?.map((flag) => (
            <form
              key={flag.provider}
              action={updateProviderAvailability}
              className="rounded-2xl border border-white/10 p-4"
            >
              <input type="hidden" name="provider" value={flag.provider} />
              <h3 className="mb-4 text-sm font-semibold capitalize">
                {flag.provider}
              </h3>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="systemImageEnabled"
                  defaultChecked={flag.system_image_enabled}
                />
                System-funded images
              </label>
              {flag.provider === "openrouter" ? (
                <>
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      name="systemVideoEnabled"
                      defaultChecked={flag.system_video_enabled}
                    />
                    System-funded videos
                  </label>
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      name="personalImageEnabled"
                      defaultChecked={flag.personal_image_enabled}
                    />
                    Personal-key images
                  </label>
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      name="personalVideoEnabled"
                      defaultChecked={flag.personal_video_enabled}
                    />
                    Personal-key videos
                  </label>
                </>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[var(--text-faint)]">
                  Hugging Face launches as system-funded image-only. Pool
                  credentials and the shared daily allowance provide the other
                  controls.
                </p>
              )}
              <Button type="submit" size="sm" className="mt-4">
                Save availability
              </Button>
            </form>
          ))}
        </div>
      </section>
      <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="font-semibold">Hugging Face system credential pool</h2>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--text-muted)]">
          Add only project-owned or explicitly authorized tokens. Tokens are
          validated without generation, encrypted before storage, and never
          displayed again. Multiple tokens from the same Hugging Face account
          share that account&apos;s credits.
        </p>
        <form
          action={addHuggingFaceSystemCredential}
          className="mt-5 grid gap-4 rounded-2xl border border-white/10 p-4 lg:grid-cols-3"
        >
          <label className="text-xs text-[var(--text-muted)]">
            Label
            <input
              name="label"
              required
              maxLength={80}
              placeholder="Production image pool A"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 text-sm text-white"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)] lg:col-span-2">
            Hugging Face token
            <input
              name="token"
              type="password"
              required
              autoComplete="off"
              maxLength={512}
              placeholder="hf_…"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 font-mono text-sm text-white"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Priority
            <input
              name="priority"
              type="number"
              min="0"
              max="1000"
              defaultValue="100"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 text-sm text-white"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Maximum concurrency
            <input
              name="maxConcurrency"
              type="number"
              min="1"
              max="3"
              defaultValue="1"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 text-sm text-white"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Local attempts per UTC day
            <input
              name="requestLimitDaily"
              type="number"
              min="1"
              max="1000"
              defaultValue="5"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 text-sm text-white"
            />
          </label>
          <fieldset className="space-y-2 lg:col-span-3">
            <legend className="text-xs text-[var(--text-muted)]">
              Approved image models
            </legend>
            {huggingFaceImageCatalog.map((model) => (
              <label
                key={model.id}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="allowedModels"
                  value={model.id}
                  defaultChecked
                />
                {model.name}
                <span className="font-mono text-[10px] text-[var(--text-faint)]">
                  {model.provider}
                </span>
              </label>
            ))}
          </fieldset>
          <Button type="submit" size="sm" className="lg:col-span-3 lg:w-fit">
            Validate and add token
          </Button>
        </form>
        <div className="mt-5 divide-y divide-white/10">
          {systemCredentials.map((credential) => {
            const sameAccount = systemCredentials.filter(
              (item) => item.accountGroup === credential.accountGroup,
            ).length;
            return (
              <article
                key={credential.id}
                className="grid gap-4 py-5 text-xs lg:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      {credential.label}
                    </h3>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] capitalize">
                      {credential.status}
                    </span>
                    {sameAccount > 1 ? (
                      <span className="text-[var(--warning)]">
                        {sameAccount} tokens share one HF account
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[var(--text-muted)]">
                    ••••{credential.lastFour} · priority {credential.priority} ·
                    leases {credential.activeLeases}/{credential.maxConcurrency}{" "}
                    · attempts today{" "}
                    {credential.usageDate ===
                    new Date().toISOString().slice(0, 10)
                      ? credential.requestsUsedToday
                      : 0}
                    /{credential.requestLimitDaily}
                  </p>
                  <p className="mt-1 text-[var(--text-faint)]">
                    Models: {credential.allowedModels.join(", ")}
                  </p>
                </div>
                {credential.status !== "revoked" ? (
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <form action={validateHuggingFaceSystemCredential}>
                      <input
                        type="hidden"
                        name="credentialId"
                        value={credential.id}
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        Validate
                      </Button>
                    </form>
                    <form action={changeHuggingFaceCredentialState}>
                      <input
                        type="hidden"
                        name="credentialId"
                        value={credential.id}
                      />
                      <select
                        name="status"
                        defaultValue={
                          ["active", "draining", "disabled"].includes(
                            credential.status,
                          )
                            ? credential.status
                            : "disabled"
                        }
                        className="h-9 rounded-full border border-[var(--line)] bg-[var(--control)] px-3 text-xs"
                      >
                        <option value="active">Active</option>
                        <option value="draining">Draining</option>
                        <option value="disabled">Disabled</option>
                        <option value="revoked">Revoke and erase</option>
                      </select>
                      <Button type="submit" size="sm" className="ml-2">
                        Apply
                      </Button>
                    </form>
                  </div>
                ) : (
                  <span className="text-[var(--text-faint)]">
                    Secret erased
                  </span>
                )}
                {credential.status !== "revoked" ? (
                  <details className="lg:col-span-2">
                    <summary className="min-h-10 cursor-pointer py-2 font-semibold text-[var(--text-muted)]">
                      Edit scheduling policy
                    </summary>
                    <form
                      action={updateHuggingFaceCredentialPolicy}
                      className="grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-3"
                    >
                      <input
                        type="hidden"
                        name="credentialId"
                        value={credential.id}
                      />
                      <label className="text-[var(--text-muted)]">
                        Label
                        <input
                          name="label"
                          required
                          maxLength={80}
                          defaultValue={credential.label}
                          className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 text-white"
                        />
                      </label>
                      <label className="text-[var(--text-muted)]">
                        Priority
                        <input
                          name="priority"
                          type="number"
                          min="0"
                          max="1000"
                          defaultValue={credential.priority}
                          className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 text-white"
                        />
                      </label>
                      <label className="text-[var(--text-muted)]">
                        Concurrency
                        <input
                          name="maxConcurrency"
                          type="number"
                          min="1"
                          max="3"
                          defaultValue={credential.maxConcurrency}
                          className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 text-white"
                        />
                      </label>
                      <label className="text-[var(--text-muted)]">
                        Daily attempts
                        <input
                          name="requestLimitDaily"
                          type="number"
                          min="1"
                          max="1000"
                          defaultValue={credential.requestLimitDaily}
                          className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 text-white"
                        />
                      </label>
                      <fieldset className="space-y-2 sm:col-span-2">
                        <legend className="text-[var(--text-muted)]">
                          Allowed models
                        </legend>
                        {huggingFaceImageCatalog.map((model) => (
                          <label
                            key={model.id}
                            className="mr-4 inline-flex min-h-10 items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              name="allowedModels"
                              value={model.id}
                              defaultChecked={credential.allowedModels.includes(
                                model.id,
                              )}
                            />
                            {model.name}
                          </label>
                        ))}
                      </fieldset>
                      <Button type="submit" size="sm" className="sm:w-fit">
                        Save policy
                      </Button>
                    </form>
                  </details>
                ) : null}
              </article>
            );
          })}
          {!systemCredentials.length ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              No Hugging Face system credentials have been added.
            </p>
          ) : null}
        </div>
      </section>
      <section className="mt-8 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="font-semibold">Workspace access</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Role changes are server-authorized and written to the audit trail.
          </p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {profiles?.length ? (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex flex-wrap items-center gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {profile.display_name || "Unnamed creator"}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-[var(--text-faint)]">
                    {profile.id}
                  </p>
                </div>
                <form
                  action={updateUserRole}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="userId" value={profile.id} />
                  <select
                    name="role"
                    defaultValue={profile.role}
                    aria-label={`Role for ${profile.display_name || profile.id}`}
                    className="h-9 rounded-full border border-[var(--line)] bg-[var(--control)] px-3 text-xs"
                  >
                    <option value="tester">Tester</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                </form>
              </div>
            ))
          ) : (
            <p className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">
              No profiles are available yet.
            </p>
          )}
        </div>
      </section>
      <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="font-semibold">Generation diagnostics</h2>
        <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
          The latest 20 sanitized job events. Credentials, provider responses,
          and private media URLs are never shown.
        </p>
        <ol className="mt-5 divide-y divide-white/10">
          {recentJobs?.map((job) => (
            <li
              key={job.id}
              className="grid gap-2 py-4 text-xs sm:grid-cols-[auto_1fr_auto]"
            >
              <span className="font-mono">{job.id.slice(0, 8)}</span>
              <span className="text-[var(--text-muted)]">
                {job.media_type} · {job.funding_source ?? "legacy"} ·{" "}
                {job.resolved_model ?? "legacy model"}
              </span>
              <span>
                {job.status}
                {job.actual_cost_usd !== null
                  ? ` · $${Number(job.actual_cost_usd).toFixed(6)}`
                  : ""}
                {job.reconciliation_code ? " · review" : ""}
              </span>
            </li>
          ))}
        </ol>
        <h3 className="mt-7 text-sm font-semibold">Sanitized event log</h3>
        <ol className="mt-3 divide-y divide-white/10">
          {events?.map((event, index) => (
            <li
              key={`${event.generation_id}:${event.created_at}:${index}`}
              className="flex flex-wrap gap-x-6 gap-y-2 py-4 text-xs"
            >
              <span className="font-mono">
                {event.generation_id.slice(0, 8)}
              </span>
              <span>{event.status}</span>
              <span className="text-[var(--text-muted)]">
                {[
                  "provider_rejected",
                  "credential_rejected",
                  "payment_required",
                  "model_unavailable",
                  "rate_limited",
                  "provider_failed",
                  "submission_unknown",
                  "output_unavailable",
                  "timed_out",
                ].includes(event.error_code)
                  ? event.error_code
                  : "—"}
              </span>
              <span className="text-[var(--text-muted)]">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
        <h3 className="mt-7 text-sm font-semibold">
          Hugging Face pool attempts
        </h3>
        <ol className="mt-3 divide-y divide-white/10">
          {huggingFaceAttempts.map((attempt) => (
            <li
              key={`${attempt.generationId}:${attempt.attemptNumber}`}
              className="flex flex-wrap gap-x-6 gap-y-2 py-4 text-xs"
            >
              <span className="font-mono">
                {attempt.generationId.slice(0, 8)} · #{attempt.attemptNumber}
              </span>
              <span>{attempt.outcome}</span>
              <span className="text-[var(--text-muted)]">
                {attempt.safeErrorCode ?? "—"}
              </span>
              <span className="text-[var(--text-muted)]">
                {attempt.httpStatus ?? "—"} · {attempt.latencyMs ?? "—"}ms
              </span>
            </li>
          ))}
        </ol>
        {!recentJobs?.length && !events?.length && (
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            No generation events yet.
          </p>
        )}
      </section>
    </main>
  );
}
