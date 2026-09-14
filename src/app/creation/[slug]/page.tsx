import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { creations } from "@/content/creations";
import { CreationDetail } from "@/components/creation/creation-detail";
import { findCreation } from "@/lib/discovery/creation-recipe";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return creations.map(({ id }) => ({ slug: id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const creation = findCreation(slug);
  if (!creation) return { title: "Creation not found" };

  return {
    title: creation.title,
    description: creation.prompt,
    alternates: { canonical: `/creation/${creation.id}` },
    openGraph: {
      title: `${creation.title} — LumaForge`,
      description: creation.prompt,
      type: "article",
      images: [
        {
          url: creation.src,
          width: creation.width,
          height: creation.height,
          alt: creation.title,
        },
      ],
    },
  };
}

export default async function CreationPage({ params }: Props) {
  const { slug } = await params;
  const creation = findCreation(slug);
  if (!creation) notFound();
  return <CreationDetail creation={creation} />;
}
