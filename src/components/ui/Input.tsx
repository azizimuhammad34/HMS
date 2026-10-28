import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, id, className = "", ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)] outline-none ring-[var(--color-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2 ${className}`}
        {...props}
      />
      {error ? <span className="block text-xs text-[var(--color-danger)]">{error}</span> : null}
    </label>
  );
}
