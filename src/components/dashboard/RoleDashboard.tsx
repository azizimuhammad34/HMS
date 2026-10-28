import { MetricCard } from "@/components/ui/MetricCard";
import type { RoleDashboardSummary } from "@/lib/services/dashboard";
import { ROLE_LABELS } from "@/types/roles";
import Link from "next/link";

export function RoleDashboardView({ data }: { data: RoleDashboardSummary }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {ROLE_LABELS[data.role]} dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Summary for {data.dateLabel} (Asia/Karachi)
        </p>
      </div>

      <section
        aria-label="Summary metrics"
        className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3 border-y border-[var(--color-border)] py-2"
      >
        {data.cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
          />
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3 text-sm">
          {data.quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      {data.notes.length > 0 ? (
        <ul className="space-y-1 text-sm text-[var(--color-text-muted)]">
          {data.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
