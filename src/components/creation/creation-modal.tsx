"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";

export function CreationModal({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Dialog
      open
      onClose={() => router.back()}
      label={`${title} creation details`}
      className="h-dvh max-h-dvh w-full max-w-none rounded-none border-0 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:rounded-[1.5rem] sm:border lg:max-w-[1500px]"
    >
      <div className="h-full overflow-y-auto">{children}</div>
    </Dialog>
  );
}
