import { EmptyState } from "@/components/ui/EmptyState";
import type { SuperAdminDashboard as Data } from "@/lib/services/dashboard";
import Link from "next/link";

function formatMoney(amount: number, currency = "PKR"): string {
  return `${currency} ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function SuperAdminDashboardView({ data }: { data: Data }) {
  const { metrics, dateLabel, timezone } = data;
  const rangeHint = `${dateLabel} (${timezone})`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          Super Admin dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Operational overview for {rangeHint}. Revenue counts actual payments
          received, not invoices issued.
        </p>
      </div>

      <section
        aria-label="Today metrics"
        className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4 border-y border-[var(--color-border)] py-2"
      >
        
        
        
        
      </section>

      <section className="grid gap-0 sm:grid-cols-2 border-b border-[var(--color-border)] pb-2">
        
        
      </section>

      {data.alerts.length > 0 ? (
        <section aria-label="Alerts" className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Operational alerts
          </h2>
          <ul className="space-y-1 text-sm text-amber-900">
            {data.alerts.map((alert) => (
              <li key={alert} className="border-l-2 border-amber-400 pl-3">
                {alert}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
            Recent patient registrations
          </h2>
          {data.recentRegistrations.length === 0 ? (
            <EmptyState
              title="No registrations today"
              description="Newly registered patients will appear here."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
              {data.recentRegistrations.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      {p.fullName}
                    </Link>
                    <p className="text-xs text-[var(--color-text-muted)]">{p.patientId}</p>
                  </div>
                  <time className="text-xs text-[var(--color-text-muted)]">
                    {new Date(p.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: timezone,
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
            Recent payment activity
          </h2>
          {data.recentPayments.length === 0 ? (
            <EmptyState
              title="No payments today"
              description="Completed and refunded payments for today will appear here."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
              {data.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      {formatMoney(p.amount, p.currency)}
                    </p>
                    <p className="text-xs capitalize text-[var(--color-text-muted)]">
                      {p.status}
                    </p>
                  </div>
                  <time className="text-xs text-[var(--color-text-muted)]">
                    {new Date(p.paidAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: timezone,
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-[var(--color-primary)] underline-offset-2 hover:underline" href="/users">
            Manage users
          </Link>
          <Link className="text-[var(--color-primary)] underline-offset-2 hover:underline" href="/patients">
            Patients
          </Link>
          <Link className="text-[var(--color-primary)] underline-offset-2 hover:underline" href="/patients/new">
            Register patient
          </Link>
          <Link className="text-[var(--color-primary)] underline-offset-2 hover:underline" href="/appointments">
            Appointments
          </Link>
          <Link className="text-[var(--color-primary)] underline-offset-2 hover:underline" href="/clinical">
            Clinical queue
          </Link>
          <Link className="text-[var(--color-primary)] underline-offset-2 hover:underline" href="/ipd">
            IPD census
          </Link>
          <Link className="text-[var(--color-primary)] underline-offset-2 hover:underline" href="/settings">
            Hospital settings
          </Link>
        </div>
      </section>
    </div>
  );
}
