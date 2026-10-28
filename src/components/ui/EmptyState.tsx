type Props = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: Props) {
  return (
    <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-center">
      <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
      ) : null}
    </div>
  );
}
