import Image from "next/image";
import Link from "next/link";

export default function FoundationPage() {
  return (
    <main className="min-h-screen bg-[#08090a] text-[#f4f5f2]">
      <nav
        className="flex h-16 items-center justify-between border-b border-white/10 px-5 md:px-8"
        aria-label="Primary navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-3 font-semibold tracking-tight"
        >
          <Image src="/brand/mark.svg" alt="" width={28} height={28} priority />
          LumaForge
        </Link>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#b7bab5]">
          Foundation preview
        </span>
      </nav>
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="max-w-xl">
          <p className="mb-5 text-xs font-semibold tracking-[0.22em] text-[#c8ff3d] uppercase">
            Creative intelligence, directed by you
          </p>
          <h1 className="text-5xl leading-[0.94] font-semibold tracking-[-0.05em] text-balance sm:text-7xl">
            Make the image you can already see.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-pretty text-[#a5a9a3] sm:text-lg">
            A media-first studio for discovering remarkable work, carrying its
            creative recipe forward, and shaping an original result.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full bg-[#c8ff3d] px-5 py-3 text-sm font-semibold text-[#111408]">
              Guided mode ready
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-[#d9dbd7]">
              Live providers plug in securely
            </span>
          </div>
        </div>
        <div className="relative aspect-[3/2] overflow-hidden rounded-3xl border border-white/10 bg-[#141618]">
          <Image
            src="/brand/lumaforge-cover.png"
            alt="A cinematic LumaForge composition of glass sculpture, fashion, and desert architecture"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-24">
            <p className="text-xs tracking-[0.18em] text-white/60 uppercase">
              Original visual system · 01
            </p>
            <p className="mt-2 text-xl font-medium">Cobalt / Ember</p>
          </div>
        </div>
      </section>
    </main>
  );
}
