"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

const links = [
  ["Explore", "/"],
  ["Image studio", "/studio"],
  ["Video studio", "/studio"],
  ["Effects", "/effects"],
  ["Assets", "/assets"],
] as const;

export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Navigation"
      className="mt-auto mb-0 w-full max-w-none rounded-b-none"
    >
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-5">
        <Image src="/brand/mark.svg" alt="" width={28} height={28} />
        <span className="font-semibold">LumaForge</span>
      </div>
      <nav className="p-2" aria-label="Mobile navigation">
        {links.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            onClick={onClose}
            className="flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-medium hover:bg-white/6"
          >
            {label}
            <ArrowUpRight
              size={17}
              className="text-[var(--text-faint)]"
              aria-hidden="true"
            />
          </Link>
        ))}
      </nav>
      <div className="p-4 pt-2">
        <Link
          href="/studio"
          onClick={onClose}
          className="flex min-h-12 items-center justify-center rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)]"
        >
          Create something
        </Link>
      </div>
    </Dialog>
  );
}
