"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { resultHref, type RunResponse } from "@/lib/generation/contracts";
import {
  ImageIcon,
  Video,
  WandSparkles,
  ShieldCheck,
  Sparkles,
  LockKeyhole,
} from "lucide-react";
import {
  studioModels,
  studioPresets,
  getStudioModel,
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
import { GuidedRunner, startGuidedRun } from "./guided-runner";

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

function initialConfiguration(parsed: ParsedStudioRecipe): StudioConfiguration {
  const recipe = parsed.recipe;
  const model =
    studioModels.find(
      (item) => item.name === recipe?.model && item.media === recipe.mode,
    ) ?? studioModels.find((item) => item.media === (recipe?.mode ?? "image"))!;
  return {
    ...defaults(model),
    execution: "guided",
    prompt: recipe?.prompt ?? "",
    preset: studioPresets.some((preset) => preset === recipe?.preset)
      ? recipe!.preset
      : "None",
    ratio:
      recipe && model.ratios.includes(recipe.ratio)
        ? recipe.ratio
        : model.ratios[0]!,
    referenceCount: 0,
    ...(recipe?.quality && model.qualities.includes(recipe.quality)
      ? { quality: recipe.quality }
      : {}),
    ...(recipe?.resolution && model.resolutions.includes(recipe.resolution)
      ? { resolution: recipe.resolution }
      : {}),
    ...(recipe?.quantity &&
    Number.isInteger(recipe.quantity) &&
    recipe.quantity <= model.maxQuantity &&
    recipe.quantity > 0
      ? { quantity: recipe.quantity }
      : {}),
    ...(recipe?.duration && model.durations.includes(recipe.duration)
      ? { duration: recipe.duration }
      : {}),
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
  connectedProviders,
  enabledLiveModels,
}: {
  parsed: ParsedStudioRecipe;
  signedIn: boolean;
  connectedProviders: string[];
  enabledLiveModels: string[];
}) {
  const [configuration, setConfiguration] = useState(() =>
    initialConfiguration(parsed),
  );
  const [references, setReferences] = useState<StudioReference[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  const submissionLock = useRef(false);
  const router = useRouter();
  const { notify } = useToast();
  const model = getStudioModel(configuration.modelId, configuration.execution)!;
  const source = parsed.recipe?.source
    ? findCreation(parsed.recipe.source)
    : undefined;
  const availableModels = studioModels
    .map((item) => getStudioModel(item.id, configuration.execution)!)
    .filter(
      (item) =>
        item.media === configuration.media &&
        (configuration.execution === "guided" || item.provider),
    );
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
    setConfiguration((current) => ({ ...current, ...defaults(next) }));
    setErrors([]);
    setModelSearch("");
  }
  function selectMedia(media: "image" | "video") {
    const next = studioModels.find((item) => item.media === media)!;
    setConfiguration((current) => ({
      ...current,
      ...defaults(next),
      execution: "guided",
    }));
    setErrors([]);
  }
  function selectExecution(execution: "guided" | "live") {
    if (execution === "live") {
      const next = studioModels.find(
        (item) => item.media === configuration.media && item.provider,
      );
      if (!next) {
        setErrors([
          "Live video adapters are not enabled. Use guided mode for motion studies.",
        ]);
        return;
      }
      setConfiguration((current) => ({
        ...current,
        ...defaults(getStudioModel(next.id, "live")!),
        execution,
      }));
    } else update("execution", execution);
  }
  function review() {
    const input = { ...configuration, referenceCount: references.length };
    const issues = validateStudioConfiguration(input);
    if (
      input.execution === "live" &&
      input.modelId === "hailuo" &&
      references.some(
        (reference) =>
          Math.abs(reference.width / reference.height - 16 / 9) > 0.02,
      )
    )
      issues.push("Use a 16:9 reference for this Hailuo workflow.");
    if (
      input.execution === "live" &&
      !enabledLiveModels.includes(input.modelId)
    )
      issues.push(
        "This live workflow is disabled. A superadmin can enable the provider and media type.",
      );
    if (
      input.execution === "live" &&
      (!signedIn ||
        !model.provider ||
        !connectedProviders.includes(model.provider))
    )
      issues.push("Connect a valid provider key before using live mode.");
    if (
      input.execution === "live" &&
      references.some((reference) => !reference.path)
    )
      issues.push("Upload each live reference privately before continuing.");
    setErrors(issues);
    if (!issues.length) setReviewOpen(true);
  }

  function runGuided() {
    try {
      startGuidedRun({ ...configuration, referenceCount: references.length });
      setReviewOpen(false);
      notify("Guided study started. Results appear below the composer.");
    } catch {
      setReviewOpen(false);
      setErrors([
        "Could not save this run. Enable browser storage and review a valid guided recipe before trying again.",
      ]);
    }
  }
  function saveDraft() {
    try {
      localStorage.setItem(
        "lumaforge:studio-draft",
        JSON.stringify({
          ...configuration,
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

  async function runLive() {
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    setReviewOpen(false);
    const id = crypto.randomUUID();
    setLiveId(id);
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
          confirmedCost: true,
        }),
      });
      const result = (await response.json()) as RunResponse;
      if (result.run) router.push(resultHref(result.run.id));
      else
        setErrors([
          result.error ??
            "Submission could not be confirmed. Open this run or check your provider dashboard before starting another.",
        ]);
    } catch {
      setErrors([
        "Connection interrupted. Open this run or check your provider dashboard before starting another; charges may apply.",
      ]);
    } finally {
      setSubmitting(false);
      submissionLock.current = false;
    }
  }

  const composer = (
    <section
      aria-label="Generation composer"
      className="rounded-[1.5rem] border border-white/10 bg-[var(--panel)] p-5 sm:p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Creative recipe</h2>
        <span className="text-[10px] tracking-[0.1em] text-[var(--text-faint)] uppercase">
          {configuration.media}
        </span>
      </div>
      <div
        className="mb-5 flex rounded-full bg-black/30 p-1"
        aria-label="Execution mode"
      >
        {(["guided", "live"] as const).map((execution) => (
          <button
            key={execution}
            type="button"
            aria-pressed={configuration.execution === execution}
            onClick={() => selectExecution(execution)}
            className={cn(
              "min-h-9 flex-1 cursor-pointer rounded-full text-xs font-semibold",
              configuration.execution === execution
                ? "bg-white text-black"
                : "text-[var(--text-muted)] hover:text-white",
            )}
          >
            {execution === "guided" ? "Guided · free" : "Live · your key"}
          </button>
        ))}
      </div>
      <details className="mb-5 rounded-2xl border border-white/10 bg-[var(--control)]">
        <summary className="min-h-16 cursor-pointer list-none px-4 py-3">
          <p className="text-xs font-semibold">
            {model.name}{" "}
            <span className="float-right text-[var(--text-faint)]">⌄</span>
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
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
              className="block w-full cursor-pointer rounded-xl p-3 text-left hover:bg-white/7"
            >
              <p className="text-xs font-semibold">{item.name}</p>
              <p className="mt-1 text-[10px] text-[var(--text-faint)]">
                {item.description}
              </p>
            </button>
          ))}
          {!matchingModels.length ? (
            <p className="p-3 text-xs text-[var(--text-faint)]">
              No compatible models found.
            </p>
          ) : null}
        </div>
      </details>
      <label
        className="block text-xs font-semibold text-[var(--text-muted)]"
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
        className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white placeholder:text-[var(--text-faint)]"
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
          value={configuration.ratio}
          options={model.ratios}
          onChange={(value) => update("ratio", value)}
        />
        <SelectControl
          label="Quality"
          value={configuration.quality}
          options={model.qualities}
          onChange={(value) => update("quality", value)}
        />
        <SelectControl
          label="Resolution"
          value={configuration.resolution}
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
        ) : (
          <SelectControl
            label="Outputs"
            value={String(configuration.quantity)}
            options={Array.from({ length: model.maxQuantity }, (_, index) =>
              String(index + 1),
            )}
            onChange={(value) => update("quantity", Number(value))}
          />
        )}
      </div>
      <div className="mt-6 border-t border-white/8 pt-5">
        <ReferenceInput
          references={references}
          onChange={setReferences}
          maxCount={model.maxReferences}
          signedIn={signedIn}
        />
      </div>
      {configuration.execution === "live" ? (
        <div className="mt-5 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/5 p-3 text-xs leading-5 text-[var(--warning)]">
          Provider calls may incur charges on your connected account.{" "}
          <Link href="/settings/providers" className="font-semibold underline">
            Manage keys
          </Link>
        </div>
      ) : (
        <p className="mt-5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <ShieldCheck
            className="size-4 text-[var(--action)]"
            aria-hidden="true"
          />
          Guided studies never call an external model.
        </p>
      )}
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
        className="mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)] hover:bg-[var(--action-hover)]"
      >
        <WandSparkles className="size-4" aria-hidden="true" />
        Review generation
      </button>
    </section>
  );

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
          Recipe loaded. Every setting below is editable.
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
                  ? "Inspiration, not your generated output"
                  : "Your next visual starts here"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                {source?.title ?? "A blank frame. An open direction."}
              </h2>
              <p className="mt-2 max-w-md text-xs leading-5 text-white/50">
                Build your recipe. Review settings and privacy before execution.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/8 p-4 text-xs text-[var(--text-faint)]">
            <span className="inline-flex items-center gap-2">
              <LockKeyhole className="size-3" aria-hidden="true" />
              Private by default
            </span>
            <Link href="/" className="hover:text-white">
              Find inspiration
            </Link>
          </div>
        </section>
        {composer}
      </div>
      <GuidedRunner />
      {liveId && (
        <p
          role="status"
          className="mt-5 text-sm leading-7 text-[var(--text-muted)]"
        >
          {submitting
            ? "Submitting your confirmed live run. Image generation may take several minutes."
            : "Latest live submission:"}{" "}
          <Link href={resultHref(liveId)} className="underline">
            Open persisted run →
          </Link>
        </p>
      )}
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
              ["Mode", configuration.execution],
              ["Model", model.name],
              [
                "Provider",
                configuration.execution === "guided"
                  ? "Local guided engine"
                  : (model.provider ?? "Unavailable"),
              ],
              ["Privacy", "Private"],
              ["Aspect ratio", configuration.ratio],
              ["Outputs", String(configuration.quantity)],
              ["Quality", configuration.quality],
              ["Resolution", configuration.resolution],
              ["References", String(references.length)],
              ...(configuration.media === "video"
                ? [["Duration", `${configuration.duration}s`]]
                : []),
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-[var(--text-faint)]">{term}</dt>
                <dd className="mt-1 font-semibold capitalize">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 rounded-xl bg-black/25 p-4 text-xs leading-6 text-[var(--text-muted)]">
            {configuration.prompt}
          </p>
          <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">
            {configuration.execution === "live"
              ? "A real run sends your prompt and selected references to the named provider and may incur charges. No provider call has been made."
              : "A guided run uses authored study assets, not a live AI model. No external charges apply."}
          </p>
          <p className="mt-3 text-xs leading-5 text-[var(--text-faint)]">
            {configuration.execution === "guided"
              ? "Prompt and preset select an authored study. References and output settings do not change its pixels. Video results are motion posters, not generated clips. This run is saved only on this browser."
              : "Confirming submits one paid generation using your connected key. Preset direction is appended to the prompt. References are shared only with the named provider; Replicate video also uses MiniMax. A synchronous OpenAI request may take up to four minutes; an interrupted submission is never automatically retried."}
          </p>
          {configuration.execution === "guided" && (
            <button
              type="button"
              onClick={runGuided}
              className="mt-6 min-h-11 w-full cursor-pointer rounded-full bg-[var(--action)] text-sm font-semibold text-[var(--action-ink)]"
            >
              Run free guided study
            </button>
          )}
          {configuration.execution === "live" && (
            <button
              type="button"
              disabled={submitting}
              onClick={runLive}
              className="mt-6 min-h-11 w-full rounded-full bg-[var(--action)] text-sm font-semibold text-[var(--action-ink)] disabled:opacity-50"
            >
              Confirm paid live generation
            </button>
          )}
          <button
            type="button"
            onClick={saveDraft}
            className="mt-6 min-h-11 w-full cursor-pointer rounded-full bg-[var(--action)] text-sm font-semibold text-[var(--action-ink)]"
          >
            Save reviewed draft
          </button>
        </div>
      </Dialog>
    </main>
  );
}
