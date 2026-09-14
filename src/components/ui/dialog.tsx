"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
};

export function Dialog({
  open,
  onClose,
  label,
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line-strong)] bg-[var(--panel)] p-0 text-[var(--text)] shadow-[var(--shadow-dialog)] backdrop:bg-black/75 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      {children}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Close ${label}`}
        onClick={onClose}
        className="absolute top-3 right-3 z-10"
      >
        <X aria-hidden="true" size={18} />
      </Button>
    </dialog>
  );
}
