"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  configurationHref,
  resultHref,
  type FreeAllowance,
  type RunResponse,
} from "@/lib/generation/contracts";
import type { Route } from "next";
import {
  ImageIcon,
  Video,
  WandSparkles,
  ShieldCheck,
  Sparkles,
  LockKeyhole,
} from "lucide-react";
import {
  modelsForFunding,
  studioPresets,
  type FundingSource,
  type StudioModel,
} from "@/content/studio-models";
import {
  findCreation,
  type ParsedStudioRecipe,
} from "@/lib/discovery/creation-recipe";
import {
  validateStudioConfiguration,
  type StudioConfiguration,
} from "@/lib/studio/validation";
import { ReferenceInput, type StudioReference } from "./reference-input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type LiveProvider = "openrouter" | "huggingface";
type Availability = Record<
  LiveProvider,
  Record<FundingSource, Record<"image" | "video", boolean>>
>;

function defaults(model: StudioModel) {
  return {
    media: model.media,
    modelId: model.id,
    ratio: model.ratios[0]!,
    quality: model.qualities[0]!,
    resolution: model.resolutions[0]!,
    quantity: 1,
    duration: model.durations[0] ?? 0,
  };
}

function availableFundingModels(
  media: "image" | "video",
  funding: FundingSource,
  availability: Availability,
) {
  const all = modelsForFunding(media, funding);
  const enabled = all.filter((model) => {
    const provider: LiveProvider =
      model.provider === "huggingface" ? "huggingface" : "openrouter";
    return availability[provider][funding][media];
  });
  return enabled.length ? enabled : all;
}

function initialConfiguration(
  parsed: ParsedStudioRecipe,
  availability: Availability,
): StudioConfiguration {
  const recipe = parsed.recipe;
  const candidates = availableFundingModels(
    recipe?.mode ?? "image",
    "system_free",
    availability,
  );
  const model =
    candidates.find((item) => item.name === recipe?.model) ?? candidates[0]!;
  return {
    ...defaults(model),
    execution: "live",
    prompt: recipe?.prompt ?? "",
    preset: studioPresets.some((preset) => preset === recipe?.preset)
      ? recipe!.preset
      : "None",
    ratio:
      recipe && model.ratios.includes(recipe.ratio)
        ? recipe.ratio
        : model.ratios[0]!,
    referenceCount: 0,
  };
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-[11px] text-[var(--text-muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-white/10 bg-[var(--control)] px-3 text-xs text-white hover:border-white/20"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function GenerationStudio({
  parsed,
  signedIn,
  emailVerified,
  personalKeyConnected,
  allowance,
  availability,
}: {
  parsed: ParsedStudioRecipe;
  signedIn: boolean;
  emailVerified: boolean;
  personalKeyConnected: boolean;
  allowance: FreeAllowance | null;
  availability: Availability;
}) {
  const [fundingSource, setFundingSource] =
    useState<FundingSource>("system_free");
  const [configuration, setConfiguration] = useState(() =>
    initialConfiguration(parsed, availability),
  );
  const [references, setReferences] = useState<StudioReference[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const submissionLock = useRef(false);
  const router = useRouter();
  const { notify } = useToast();
  const availableModels = availableFundingModels(
    configuration.media,
    fundingSource,
    availability,
  );
  const model =
    availableModels.find((item) => item.id === configuration.modelId) ??
    availableModels[0]!;
  const liveProvider: LiveProvider =
    model.provider === "huggingface" ? "huggingface" : "openrouter";
  const providerName =
    liveProvider === "huggingface" ? "Hugging Face" : "OpenRouter";
  const source = parsed.recipe?.source
    ? findCreation(parsed.recipe.source)
    : undefined;
  const matchingModels = availableModels.filter((item) =>
    `${item.name} ${item.description}`
      .toLowerCase()
      .includes(modelSearch.toLowerCase()),
  );

  function update<K extends keyof StudioConfiguration>(
    key: K,
    value: StudioConfiguration[K],
  ) {
    setErrors([]);
    setConfiguration((current) => ({ ...current, [key]: value }));
  }

  function selectModel(next: StudioModel) {
    setConfiguration((current) => ({
      ...current,
      ...defaults(next),
      execution: "live",
    }));
    setErrors([]);
    setModelSearch("");
  }

  function selectMedia(media: "image" | "video") {
    const next = availableFundingModels(media, fundingSource, availability)[0]!;
    selectModel(next);
  }

  function selectFunding(nextFunding: FundingSource) {
    const candidates = availableFundingModels(
      configuration.media,
      nextFunding,
      availability,
    );
    const next =
      candidates.find((item) => item.id === configuration.modelId) ??
      candidates[0]!;
    setFundingSource(nextFunding);
    selectModel(next);
  }

  function review() {
    const input = { ...configuration, referenceCount: references.length };
    if (!signedIn) {
      const returnTo = configurationHref(input);
      router.push(`/account?next=${encodeURIComponent(returnTo)}` as Route);
      return;
    }
    const issues = validateStudioConfiguration(input);
    if (fundingSource === "system_free") {
      if (!emailVerified)
        issues.push("Verify your email before using the free daily allowance.");
      if (!allowance?.available)
        issues.push("The free daily allowance is temporarily unavailable.");
      if (!allowance?.remaining)
        issues.push("Your three free generations are used for today.");
    } else if (!personalKeyConnected) {
      issues.push(
        "Connect a valid OpenRouter key before using personal billing.",
      );
    }
    if (!availability[liveProvider][fundingSource][input.media])
      issues.push(`This ${providerName} workflow is currently disabled.`);
    if (references.some((reference) => !reference.path))
      issues.push("Upload each reference privately before continuing.");
    setErrors(issues);
    setConfirmed(false);
    if (!issues.length) setReviewOpen(true);
  }

  function saveDraft() {
    try {
      localStorage.setItem(
        "lumaforge:studio-draft",
        JSON.stringify({
          ...configuration,
          fundingSource,
          referencePaths: references.flatMap((reference) =>
            reference.path ? [reference.path] : [],
          ),
          savedAt: new Date().toISOString(),
        }),
      );
      setReviewOpen(false);
      notify("Recipe draft saved on this device");
    } catch {
      notify("Draft storage is unavailable on this device");
    }
  }

  async function run() {
    if (submissionLock.current || !confirmed) return;
    submissionLock.current = true;
    setSubmitting(true);
    setReviewOpen(false);
    const id = crypto.randomUUID();
    setRunId(id);
    setErrors([]);
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          configuration: {
            ...configuration,
            referenceCount: references.length,
          },
          referencePaths: references.flatMap((reference) =>
            reference.path ? [reference.path] : [],
          ),
          fundingSource,
          confirmedAllowance: fundingSource === "system_free",
          confirmedExternalCost: fundingSource === "personal_key",
        }),
      });
      const result = (await response.json()) as RunResponse;
      if (result.run) router.push(resultHref(result.run.id));
      else
        setErrors([
          result.error ??
            "Submission could not be confirmed. Open the run before trying another generation.",
        ]);
    } catch {
      setErrors([
        "Connection interrupted. Open the persisted run before trying again; the request may have been accepted.",
      ]);
    } finally {
      setSubmitting(false);
      submissionLock.current = false;
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
            Creative workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Direct the next frame.
          </h1>
        </div>
        <div className="flex rounded-full border border-white/10 bg-[var(--panel)] p-1">
          {(["image", "video"] as const).map((media) => {
            const Icon = media === "image" ? ImageIcon : Video;
            return (
              <button
                type="button"
                key={media}
                aria-pressed={configuration.media === media}
                onClick={() => selectMedia(media)}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-5 text-xs font-semibold capitalize",
                  configuration.media === media
                    ? "bg-[var(--action)] text-[var(--action-ink)]"
                    : "text-[var(--text-muted)] hover:text-white",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {media}
              </button>
            );
          })}
        </div>
      </div>

      {parsed.recipe ? (
        <p className="mb-5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Sparkles
            className="size-4 text-[var(--action)]"
            aria-hidden="true"
          />
          Inspiration recipe loaded. Choose a real model and review every
          setting.
        </p>
      ) : null}
      {parsed.notices.map((notice) => (
        <p key={notice} className="mb-4 text-xs text-[var(--warning)]">
          {notice}
        </p>
      ))}

      <div
        className={cn(
          "grid gap-5 lg:items-start",
          configuration.media === "video"
            ? "lg:grid-cols-[380px_minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(0,1fr)_400px]",
        )}
      >
        <section
          aria-label="Preview stage"
          className={cn(
            "relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#101214]",
            configuration.media === "video" && "lg:order-2",
          )}
        >
          <div className="relative flex min-h-[26rem] items-center justify-center sm:min-h-[40rem]">
            <Image
              src={source?.src ?? "/media/system/processing-texture.svg"}
              alt={
                source
                  ? `${source.title} inspiration preview`
                  : "Abstract studio preview stage"
              }
              fill
              priority
              sizes="(max-width:1024px) 100vw, 65vw"
              className="object-contain opacity-85"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-6 pt-20">
              <p className="text-[10px] tracking-[0.18em] text-[var(--action)] uppercase">
                {source
                  ? "Inspiration, not generated output"
                  : `Real ${providerName} generation`}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                {source?.title ?? "A blank frame. An open direction."}
              </h2>
              <p className="mt-2 max-w-md text-xs leading-5 text-white/50">
                Generated media is copied into your private workspace.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/8 p-4 text-xs text-[var(--text-faint)]">
            <span className="inline-flex items-center gap-2">
              <LockKeyhole className="size-3" aria-hidden="true" /> Private by
              default
            </span>
            <Link href="/">Find inspiration</Link>
          </div>
        </section>

        <section
          aria-label="Generation composer"
          className="rounded-[1.5rem] border border-white/10 bg-[var(--panel)] p-5 sm:p-6"
        >
          <h2 className="text-sm font-semibold">Creative recipe</h2>
          <fieldset className="mt-5 grid gap-2" aria-label="Generation funding">
            {(["system_free", "personal_key"] as const).map((funding) => (
              <button
                key={funding}
                type="button"
                aria-pressed={fundingSource === funding}
                onClick={() => selectFunding(funding)}
                className={cn(
                  "min-h-14 rounded-2xl border px-4 text-left text-xs",
                  fundingSource === funding
                    ? "border-[var(--action)] bg-[var(--action)]/8"
                    : "border-white/10 bg-black/15",
                )}
              >
                <span className="font-semibold">
                  {funding === "system_free"
                    ? `Free daily allowance${allowance ? ` — ${allowance.remaining} of 3 remaining` : ""}`
                    : "Personal OpenRouter key"}
                </span>
                <span className="mt-1 block text-[var(--text-faint)]">
                  {funding === "system_free"
                    ? "Platform-funded low-cost models. Resets at 00:00 UTC."
                    : "Charges your connected OpenRouter account."}
                </span>
              </button>
            ))}
          </fieldset>

          <details className="mt-5 rounded-2xl border border-white/10 bg-[var(--control)]">
            <summary className="min-h-16 cursor-pointer list-none px-4 py-3">
              <p className="text-xs font-semibold">
                {model.name}
                <span className="float-right">⌄</span>
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-faint)]">
                {model.description}
              </p>
            </summary>
            <div className="space-y-2 border-t border-white/10 p-3">
              <input
                type="search"
                value={modelSearch}
                onChange={(event) => setModelSearch(event.target.value)}
                aria-label="Search generation models"
                placeholder="Search models"
                className="min-h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs"
              />
              {matchingModels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={(event) => {
                    selectModel(item);
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                  }}
                  className="block w-full rounded-xl p-3 text-left hover:bg-white/7"
                >
                  <p className="text-xs font-semibold">{item.name}</p>
                  <p className="mt-1 text-[10px] text-[var(--text-faint)]">
                    {item.provider === "huggingface"
                      ? "Hugging Face"
                      : "OpenRouter"}{" "}
                    · {item.description}
                  </p>
                </button>
              ))}
            </div>
          </details>

          <label
            className="mt-5 block text-xs font-semibold text-[var(--text-muted)]"
            htmlFor="studio-prompt"
          >
            Prompt
          </label>
          <textarea
            id="studio-prompt"
            value={configuration.prompt}
            onChange={(event) => update("prompt", event.target.value)}
            maxLength={1200}
            rows={5}
            placeholder="Describe the subject, material, light, environment, and feeling…"
            className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6"
          />
          <p className="mt-1 text-right text-[10px] text-[var(--text-faint)]">
            {configuration.prompt.length} / 1,200
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <SelectControl
              label="Preset"
              value={configuration.preset}
              options={studioPresets}
              onChange={(value) => update("preset", value)}
            />
            <SelectControl
              label="Aspect ratio"
              value={
                model.ratios.includes(configuration.ratio)
                  ? configuration.ratio
                  : model.ratios[0]!
              }
              options={model.ratios}
              onChange={(value) => update("ratio", value)}
            />
            <SelectControl
              label="Quality"
              value={
                model.qualities.includes(configuration.quality)
                  ? configuration.quality
                  : model.qualities[0]!
              }
              options={model.qualities}
              onChange={(value) => update("quality", value)}
            />
            <SelectControl
              label="Resolution"
              value={
                model.resolutions.includes(configuration.resolution)
                  ? configuration.resolution
                  : model.resolutions[0]!
              }
              options={model.resolutions}
              onChange={(value) => update("resolution", value)}
            />
            {configuration.media === "video" ? (
              <SelectControl
                label="Duration (seconds)"
                value={String(configuration.duration)}
                options={model.durations.map(String)}
                onChange={(value) => update("duration", Number(value))}
              />
            ) : null}
          </div>
          <div className="mt-6 border-t border-white/8 pt-5">
            <ReferenceInput
              references={references}
              onChange={setReferences}
              maxCount={model.maxReferences}
              signedIn={signedIn}
            />
          </div>
          <div className="mt-5 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/5 p-3 text-xs leading-5 text-[var(--warning)]">
            {fundingSource === "system_free"
              ? "A provider-accepted request consumes one of your three combined daily generations."
              : "This run may incur charges on your connected OpenRouter account."}{" "}
            <Link
              href="/settings/providers"
              className="font-semibold underline"
            >
              {fundingSource === "personal_key"
                ? "Manage key"
                : "Provider settings"}
            </Link>
          </div>
          {errors.length ? (
            <ul
              role="alert"
              className="mt-4 space-y-1 text-xs leading-5 text-[var(--danger)]"
            >
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={review}
            disabled={submitting}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)] disabled:opacity-50"
          >
            <WandSparkles className="size-4" aria-hidden="true" /> Review
            generation
          </button>
        </section>
      </div>

      {runId ? (
        <p role="status" className="mt-5 text-sm text-[var(--text-muted)]">
          {submitting
            ? `Submitting the confirmed ${providerName} run…`
            : "Latest submission:"}{" "}
          <Link href={resultHref(runId)} className="underline">
            Open persisted run →
          </Link>
        </p>
      ) : null}

      <Dialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        label="Generation confirmation"
      >
        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--action)] uppercase">
            Review before running
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            One final look.
          </h2>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-xs">
            {[
              [
                "Funding",
                fundingSource === "system_free"
                  ? "Free daily allowance"
                  : "Personal OpenRouter key",
              ],
              ["Model", model.name],
              ["Provider", providerName],
              ["Privacy", "Private"],
              ["Aspect ratio", configuration.ratio],
              ["Resolution", configuration.resolution],
              ["References", String(references.length)],
              ...(configuration.media === "video"
                ? [["Duration", `${configuration.duration}s`]]
                : []),
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-[var(--text-faint)]">{term}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 rounded-xl bg-black/25 p-4 text-xs leading-6 text-[var(--text-muted)]">
            {configuration.prompt}
          </p>
          <p className="mt-5 text-xs leading-6 text-[var(--text-muted)]">
            {fundingSource === "system_free"
              ? `${providerName} will run a real generation using an authorized platform credential. Acceptance consumes one daily slot, leaving ${Math.max(0, (allowance?.remaining ?? 1) - 1)}.`
              : `OpenRouter will charge your connected account. Pricing: ${model.unitPrice}. No free slot will be used.`}
          </p>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 p-4 text-xs leading-5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1"
            />
            <span>
              {fundingSource === "system_free"
                ? "I understand when the daily slot is consumed."
                : "I confirm this externally billed OpenRouter generation."}
            </span>
          </label>
          <button
            type="button"
            disabled={submitting || !confirmed}
            onClick={run}
            className="mt-6 min-h-11 w-full rounded-full bg-[var(--action)] text-sm font-semibold text-[var(--action-ink)] disabled:opacity-50"
          >
            {fundingSource === "system_free"
              ? "Use one free generation"
              : "Confirm personal-key generation"}
          </button>
          <button
            type="button"
            onClick={saveDraft}
            className="mt-3 min-h-11 w-full rounded-full border border-white/15 text-sm font-semibold"
          >
            Save reviewed draft
          </button>
          <p className="mt-4 flex items-center gap-2 text-xs text-[var(--text-faint)]">
            <ShieldCheck className="size-4" /> No dummy output is created.
          </p>
        </div>
      </Dialog>
    </main>
  );
}
