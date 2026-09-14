import type { ReactNode } from "react";
import { AppHeader } from "./app-header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[100] -translate-y-20 rounded-full bg-[var(--action)] px-4 py-2 text-sm font-semibold text-[var(--action-ink)] transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <AppHeader />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </>
  );
}
