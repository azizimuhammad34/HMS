import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-primary)]/50",
  secondary:
    "border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]",
  ghost: "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
