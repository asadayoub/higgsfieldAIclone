"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "./button";

type ToastItem = { id: number; message: string };
type ToastContextValue = { notify: (message: string) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback(
    (id: number) =>
      setItems((current) => current.filter((item) => item.id !== id)),
    [],
  );
  const notify = useCallback(
    (message: string) => {
      const id = Date.now();
      setItems((current) => [...current.slice(-2), { id, message }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 bottom-4 z-[80] flex w-[min(380px,calc(100%-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-3 shadow-xl"
          >
            <CheckCircle2
              className="text-[var(--action)]"
              size={18}
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 text-sm">{item.message}</p>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
              className="size-8"
            >
              <X size={15} aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
