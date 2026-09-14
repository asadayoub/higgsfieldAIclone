import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "icon";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--action)] text-[var(--action-ink)] hover:bg-[var(--action-hover)]",
  secondary:
    "border border-[var(--line)] bg-[var(--control)] text-[var(--text)] hover:bg-[var(--control-hover)]",
  ghost: "text-[var(--text-muted)] hover:bg-white/7 hover:text-[var(--text)]",
};
const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 rounded-full px-3 text-xs",
  md: "min-h-11 rounded-full px-5 text-sm",
  icon: "size-10 rounded-full",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
