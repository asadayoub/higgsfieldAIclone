import { Activity, ShieldCheck, UsersRound, WandSparkles } from "lucide-react";
import { updateUserRole, updateProviderAvailability } from "./actions";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/supabase/client";

export default async function AdminPage() {
  await requireRole("superadmin", "/admin");
  const supabase = await createSupabaseServerClient();
  const [
    { data: profiles },
    { data: flags },
    { count: jobCount },
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
          .select("provider, image_enabled, video_enabled, maintenance_message")
          .order("provider"),
        supabase
          .from("generation_jobs")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("generation_events")
          .select("generation_id,status,error_code,created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ])
    : [{ data: [] }, { data: [] }, { count: 0 }, { data: [] }];
  const testers =
    profiles?.filter((profile) => profile.role === "tester").length ?? 0;
  const enabled =
    flags?.filter((flag) => flag.image_enabled || flag.video_enabled).length ??
    0;
  const cards = [
    { label: "Tester accounts", value: testers, icon: UsersRound },
    { label: "Enabled providers", value: enabled, icon: WandSparkles },
    { label: "Generation jobs", value: jobCount ?? 0, icon: Activity },
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
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
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
          Enabling permits confirmed paid runs using each creator’s own key. It
          does not submit a generation. Existing jobs can still be retrieved
          when new submissions are disabled.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {flags
            ?.filter((flag) => flag.provider !== "guided")
            .map((flag) => (
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
                    name="imageEnabled"
                    defaultChecked={flag.image_enabled}
                  />
                  Enable live images
                </label>
                {flag.provider === "replicate" && (
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      name="videoEnabled"
                      defaultChecked={flag.video_enabled}
                    />
                    Enable live video
                  </label>
                )}
                <Button type="submit" size="sm" className="mt-4">
                  Save availability
                </Button>
              </form>
            ))}
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
        {!events?.length && (
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            No generation events yet.
          </p>
        )}
      </section>
    </main>
  );
}
