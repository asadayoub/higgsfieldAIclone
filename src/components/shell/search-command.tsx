"use client";

import Link from "next/link";
import { ArrowUpRight, ImageIcon, Search, Sparkles, Video } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

const destinations = [
  {
    href: "/",
    label: "Explore creations",
    detail: "Browse original visual directions",
    icon: ImageIcon,
  },
  {
    href: "/studio",
    label: "Create an image",
    detail: "Start with prompt or reference",
    icon: Sparkles,
  },
  {
    href: "/studio",
    label: "Create a video",
    detail: "Direct motion and timing",
    icon: Video,
  },
] as const;

export function SearchCommand({
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
      label="Search LumaForge"
      className="mt-[12vh] self-start"
    >
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 pr-16">
        <Search
          size={19}
          className="text-[var(--text-muted)]"
          aria-hidden="true"
        />
        <input
          autoFocus={open}
          aria-label="Search"
          placeholder="Search creations, tools, or models"
          className="h-16 min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-[var(--text-faint)]"
        />
      </div>
      <div className="p-2">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
          Jump to
        </p>
        {destinations.map(({ href, label, detail, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/6 focus-visible:bg-white/6"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-white/6">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{label}</span>
              <span className="block truncate text-xs text-[var(--text-muted)]">
                {detail}
              </span>
            </span>
            <ArrowUpRight
              size={16}
              className="text-[var(--text-faint)]"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3 text-[11px] text-[var(--text-faint)]">
        <span>Quick navigation</span>
        <kbd className="rounded border border-[var(--line)] bg-white/5 px-1.5 py-0.5">
          Esc
        </kbd>
      </div>
    </Dialog>
  );
}
