import { notFound } from "next/navigation";
import { CreationDetail } from "@/components/creation/creation-detail";
import { CreationModal } from "@/components/creation/creation-modal";
import { findCreation } from "@/lib/discovery/creation-recipe";

export default async function InterceptedCreationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const creation = findCreation(slug);
  if (!creation) notFound();

  return (
    <CreationModal title={creation.title}>
      <CreationDetail creation={creation} modal />
    </CreationModal>
  );
}
