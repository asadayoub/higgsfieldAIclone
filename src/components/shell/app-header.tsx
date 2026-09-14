"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Folder, Menu, Search, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { MobileMenu } from "./mobile-menu";
import { SearchCommand } from "./search-command";

const navLinks = [
  ["Explore", "/"],
  ["Image", "/studio"],
  ["Video", "/studio"],
  ["Effects", "/effects"],
] as const;

export function AppHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--page)_88%,transparent)] backdrop-blur-xl">
        <div className="flex h-16 items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 font-semibold tracking-[-0.02em]"
            aria-label="LumaForge home"
          >
            <Image
              src="/brand/mark.svg"
              alt=""
              width={27}
              height={27}
              priority
            />
            <span className="hidden sm:inline">LumaForge</span>
          </Link>
          <nav
            className="hidden min-w-0 items-center gap-1 md:flex"
            aria-label="Primary navigation"
          >
            {navLinks.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-full px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-white/6 hover:text-[var(--text)]"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden lg:inline-flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                aria-label="Search LumaForge"
                className="border border-[var(--line)]"
              >
                <Search size={15} aria-hidden="true" />
                Search{" "}
                <kbd className="ml-2 text-[10px] text-[var(--text-faint)]">
                  ⌘K
                </kbd>
              </Button>
            </span>
            <span className="lg:hidden">
              <Tooltip label="Search">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search LumaForge"
                >
                  <Search size={18} aria-hidden="true" />
                </Button>
              </Tooltip>
            </span>
            <Tooltip label="Assets">
              <Link
                href="/assets"
                className="hidden size-10 place-items-center rounded-full text-[var(--text-muted)] hover:bg-white/7 hover:text-[var(--text)] sm:grid"
                aria-label="Open assets"
              >
                <Folder size={18} aria-hidden="true" />
              </Link>
            </Tooltip>
            <Tooltip label="Account">
              <Link
                href="/account"
                className="hidden size-10 place-items-center rounded-full border border-[var(--line)] bg-white/5 text-[var(--text-muted)] hover:bg-white/8 hover:text-[var(--text)] sm:grid"
                aria-label="Open account"
              >
                <UserRound size={17} aria-hidden="true" />
              </Link>
            </Tooltip>
            <Link
              href="/studio"
              className="hidden min-h-10 items-center gap-2 rounded-full bg-[var(--action)] px-4 text-xs font-semibold text-[var(--action-ink)] hover:bg-[var(--action-hover)] md:flex"
            >
              <Sparkles size={15} aria-hidden="true" />
              Create
            </Link>
            <span className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={20} aria-hidden="true" />
              </Button>
            </span>
          </div>
        </div>
      </header>
      <SearchCommand open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
