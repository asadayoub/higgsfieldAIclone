import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Info } from "lucide-react";
import {
  creationDetailHref,
  parseStudioRecipe,
} from "@/lib/discovery/creation-recipe";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = parseStudioRecipe(await searchParams);

  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl place-items-center px-5 py-12 lg:px-8">
      <section className="grid w-full gap-8 lg:grid-cols-[1fr_1.25fr]">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
            Studio
          </p>
          {parsed.recipe ? (
            <>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[var(--success)]">
                <Check aria-hidden="true" className="size-4" /> Recipe loaded
              </div>
              <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
                Make it yours.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--text-muted)]">
                The complete public recipe is ready for the editable generation
                workspace arriving in the next studio milestone.
              </p>
              <dl className="mt-7 grid max-w-lg grid-cols-2 gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 text-sm">
                {[
                  ["Mode", parsed.recipe.mode],
                  ["Model", parsed.recipe.model],
                  ["Preset", parsed.recipe.preset],
                  ["Ratio", parsed.recipe.ratio],
                ].map(([term, value]) => (
                  <div key={term}>
                    <dt className="text-[10px] tracking-[0.12em] text-[var(--text-faint)] uppercase">
                      {term}
                    </dt>
                    <dd className="mt-1.5 font-medium capitalize">{value}</dd>
                  </div>
                ))}
                <div className="col-span-2 border-t border-white/8 pt-4">
                  <dt className="text-[10px] tracking-[0.12em] text-[var(--text-faint)] uppercase">
                    Prompt
                  </dt>
                  <dd className="mt-2 line-clamp-4 leading-6 text-[var(--text-muted)]">
                    {parsed.recipe.prompt}
                  </dd>
                </div>
              </dl>
              {parsed.notices.map((notice) => (
                <p
                  key={notice}
                  className="mt-3 flex items-center gap-2 text-xs text-[var(--warning)]"
                >
                  <Info aria-hidden="true" className="size-4" /> {notice}
                </p>
              ))}
              {parsed.recipe.source ? (
                <Link
                  href={creationDetailHref(parsed.recipe.source)}
                  className="mt-5 inline-flex w-fit items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-white"
                >
                  <ArrowLeft aria-hidden="true" className="size-4" /> Return to
                  recipe
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
                Direct the next frame.
              </h1>
              <p className="mt-4 max-w-lg leading-7 text-[var(--text-muted)]">
                Image and video controls will share one creative recipe, one
                asynchronous job history, and one secure path to live providers.
              </p>
              {parsed.notices.map((notice) => (
                <p
                  key={notice}
                  className="mt-4 flex items-center gap-2 text-xs text-[var(--warning)]"
                >
                  <Info aria-hidden="true" className="size-4" /> {notice}
                </p>
              ))}
            </>
          )}
        </div>
        <div className="relative aspect-[3/2] overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]">
          <Image
            src="/media/system/processing-texture.svg"
            alt="An abstract preview of the LumaForge processing stage"
            fill
            className="object-cover"
          />
        </div>
      </section>
    </main>
  );
}
