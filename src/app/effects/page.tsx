import Image from "next/image";

const presets = [
  "editorial",
  "product",
  "architecture",
  "surreal",
  "noir",
  "vivid",
];

export default function EffectsPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-5 py-12 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
        Creative recipes
      </p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
        Effects
      </h1>
      <p className="mt-4 max-w-xl text-[var(--text-muted)]">
        Start from a directed visual language, then make it yours.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {presets.map((preset) => (
          <article
            key={preset}
            className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]"
          >
            <div className="relative aspect-square">
              <Image
                src={`/media/presets/preset-${preset}.svg`}
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <h2 className="px-3 py-3 text-sm font-medium capitalize">
              {preset}
            </h2>
          </article>
        ))}
      </div>
    </main>
  );
}
