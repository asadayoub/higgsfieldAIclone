import { useId, type ReactNode } from "react";

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <span className="group/tooltip relative inline-flex" aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute top-[calc(100%+8px)] left-1/2 z-50 hidden -translate-x-1/2 rounded-lg border border-[var(--line)] bg-[var(--control)] px-2.5 py-1.5 text-[11px] whitespace-nowrap text-[var(--text)] shadow-lg group-focus-within/tooltip:block group-hover/tooltip:block"
      >
        {label}
      </span>
    </span>
  );
}
