type Props = {
  tone?: "info" | "success" | "warning" | "error";
  children: React.ReactNode;
};

const tones = {
  info: "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)]",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  error: "border-red-200 bg-red-50 text-red-900",
};

export function Alert({ tone = "info", children }: Props) {
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`} role="alert">
      {children}
    </div>
  );
}
