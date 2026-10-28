type Props = {
  label: string;
  value: string | number;
  hint?: string;
};

export function MetricCard({ label, value, hint }: Props) {
  return (
    <div className="border-b border-[var(--color-border)] py-3 sm:border-b-0 sm:border-r sm:px-5 sm:py-1 last:border-0 first:pl-0 last:pr-0">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-text)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
