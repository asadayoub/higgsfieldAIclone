import { notFound } from "next/navigation";
import Image from "next/image";
import { publicAsset } from "@/server/generation/service";
export const metadata = {
  title: "Shared creation",
  robots: { index: false, follow: false },
};
export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let asset;
  try {
    asset = await publicAsset(slug);
  } catch {
    asset = null;
  }
  if (!asset) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs tracking-widest text-[var(--action)] uppercase">
        Publicly shared · live AI output
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{asset.title}</h1>
      <div className="mt-7 overflow-hidden rounded-3xl border border-white/10">
        {asset.media === "video" ? (
          <video
            src={asset.url}
            controls
            playsInline
            className="max-h-[750px] w-full"
          />
        ) : (
          <Image
            src={asset.url}
            alt={asset.alt}
            width={1536}
            height={1536}
            unoptimized
            className="max-h-[750px] w-full object-contain"
          />
        )}
      </div>
      <p className="mt-5 text-sm text-[var(--text-muted)]">
        This output was explicitly published by its owner. References and
        private recipe details are not shared.
      </p>
      {asset.showcaseListed ? (
        <p className="mt-2 text-xs text-[var(--text-faint)]">
          Listed in the public Explore showcase.
        </p>
      ) : null}
    </main>
  );
}
