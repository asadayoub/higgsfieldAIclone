import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Clapperboard,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import { creations, type Creation } from "@/content/creations";
import { CreationActions } from "@/components/creation/creation-actions";
import { creationDetailHref } from "@/lib/discovery/creation-recipe";

function relatedCreations(creation: Creation) {
  const sameCategory = creations.filter(
    (item) => item.id !== creation.id && item.category === creation.category,
  );
  const remaining = creations.filter(
    (item) => item.id !== creation.id && !sameCategory.includes(item),
  );
  return [...sameCategory, ...remaining].slice(0, 3);
}

export function CreationDetail({
  creation,
  modal = false,
}: {
  creation: Creation;
  modal?: boolean;
}) {
  const related = relatedCreations(creation);
  const MediaIcon = creation.type === "video" ? Clapperboard : ImageIcon;

  return (
    <article
      className={modal ? "bg-[var(--page)]" : "min-h-[calc(100vh-4rem)]"}
    >
      <div
        className={
          modal
            ? "mx-auto max-w-[1500px] p-4 pt-16 sm:p-6 sm:pt-16 lg:p-8"
            : "mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
        }
      >
        {!modal ? (
          <Link
            href="/"
            className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--line)] bg-white/4 px-4 text-xs font-semibold text-[var(--text-muted)] hover:bg-white/8 hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Back to Explore
          </Link>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] lg:items-start">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#101214]">
            <Image
              src={creation.src}
              alt={`${creation.title}, an original ${creation.category} ${creation.type} study`}
              width={creation.width}
              height={creation.height}
              priority
              sizes={
                modal
                  ? "(max-width: 1024px) 100vw, 62vw"
                  : "(max-width: 1024px) 100vw, 65vw"
              }
              className="max-h-[78dvh] min-h-[22rem] w-full object-contain"
            />
            <div className="pointer-events-none absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-black/50 px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/85 uppercase backdrop-blur-md">
              <MediaIcon aria-hidden="true" className="size-3" />
              {creation.type === "video" ? "Motion study" : creation.category}
            </div>
          </div>

          <aside className="rounded-[1.5rem] border border-white/10 bg-[var(--panel)] p-5 sm:p-7 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="size-2 rounded-full bg-[var(--action)]" />
              Public creation
            </div>
            <h1 className="mt-5 text-4xl leading-none font-semibold tracking-[-0.05em] sm:text-5xl">
              {creation.title}
            </h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <BadgeCheck
                aria-hidden="true"
                className="size-4 text-[var(--action)]"
              />
              {creation.author}
            </div>

            <CreationActions creation={creation} />

            <section
              className="mt-8 border-t border-white/8 pt-6"
              aria-labelledby="recipe-prompt"
            >
              <div className="flex items-center justify-between gap-4">
                <h2
                  id="recipe-prompt"
                  className="text-xs font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase"
                >
                  Creative prompt
                </h2>
                <Sparkles
                  aria-hidden="true"
                  className="size-4 text-[var(--action)]"
                />
              </div>
              <p className="mt-3 text-sm leading-7 text-[#d7d9d4]">
                {creation.prompt}
              </p>
            </section>

            <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-white/8 pt-6 text-sm">
              {[
                ["Model", creation.model],
                ["Preset", creation.preset],
                ["Format", creation.type],
                ["Aspect ratio", creation.ratio],
                ["Direction", creation.accent],
                ["Visibility", "Public"],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="text-[11px] tracking-[0.1em] text-[var(--text-faint)] uppercase">
                    {term}
                  </dt>
                  <dd className="mt-1.5 font-medium capitalize">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7 rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <p className="text-xs font-semibold">Transparent provenance</p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                Published from the original LumaForge showcase system. No
                private references or account data are attached to this public
                recipe.
              </p>
            </div>
          </aside>
        </div>

        <section
          className="mt-14 border-t border-white/8 pt-10"
          aria-labelledby={`related-${creation.id}`}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--action)] uppercase">
                Keep looking
              </p>
              <h2
                id={`related-${creation.id}`}
                className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
              >
                Related directions
              </h2>
            </div>
            <Link
              href="/"
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-white"
            >
              View all
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.id}
                href={creationDetailHref(item.id)}
                className="group overflow-hidden rounded-2xl border border-white/8 bg-[var(--panel)] hover:border-white/16"
              >
                <Image
                  src={item.src}
                  alt=""
                  width={item.width}
                  height={item.height}
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
                <div className="p-4">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">
                    {item.model}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
