import Image from "next/image";

export default function StudioPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl place-items-center px-5 py-12 lg:px-8">
      <section className="grid w-full gap-8 lg:grid-cols-[1fr_1.25fr]">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
            Studio
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
            Direct the next frame.
          </h1>
          <p className="mt-4 max-w-lg leading-7 text-[var(--text-muted)]">
            Image and video controls will share one creative recipe, one
            asynchronous job history, and one secure path to live providers.
          </p>
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
