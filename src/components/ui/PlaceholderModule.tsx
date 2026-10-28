export function PlaceholderModule({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-text)]">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
        {description}
      </p>
    </div>
  );
}
