import { EmptyState } from "@/components/ui/EmptyState";
import type { SuperAdminDashboard as Data } from "@/lib/services/dashboard";
import Link from "next/link";
import type { ReactNode } from "react";

function formatMoney(amount: number, currency = "PKR"): string {
  return `${currency} ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

function weekdayLabel(dateLabel: string): string {
  const [year, month, day] = dateLabel.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.31.52-2.47 1.34-3.42C10.5 13.2 9.32 13 8 13Zm8 0c-.32 0-.64.02-.95.05A5.6 5.6 0 0 1 18 18v2h6v-2c0-2.66-5.33-4-8-4Z"
      />
    </svg>
  );
}

function IconVisits() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4Z"
      />
    </svg>
  );
}

function IconRevenue() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-1.1A4.5 4.5 0 0 1 8 12h2a2.5 2.5 0 0 0 2.5 2.5H13A1.5 1.5 0 0 0 14.5 13c0-.83-.67-1.17-2.2-1.55C10.28 10.9 8 10.2 8 8a3.5 3.5 0 0 1 3-3.45V3h2v1.1A3.5 3.5 0 0 1 16 8h-2a1.5 1.5 0 0 0-1.5-1.5H12A1.5 1.5 0 0 0 10.5 8c0 .55.4.92 2.05 1.35C14.5 9.95 17 10.7 17 13a3.5 3.5 0 0 1-3 3.46V17Z"
      />
    </svg>
  );
}

function IconCollections() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21 7H3V5h18Zm0 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Zm-9 8a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z"
      />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <article className="sa-kpi">
      <div className="sa-kpi-icon">{icon}</div>
      <p className="sa-kpi-label">{label}</p>
      <p className="sa-kpi-value">{value}</p>
      <p className="sa-kpi-hint">{hint}</p>
    </article>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="sa-panel">
      <header className="sa-panel-head">
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Meter({
  label,
  value,
  max,
  tone = "teal",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "teal" | "blue" | "amber" | "slate";
}) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="sa-meter">
      <div className="sa-meter-row">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="sa-meter-track" aria-hidden="true">
        <span
          className={`sa-meter-fill sa-meter-${tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function RevenueChart({
  points,
}: {
  points: Data["revenueTrend"];
}) {
  const max = Math.max(0, ...points.map((point) => point.revenue));
  const hasRevenue = max > 0;

  return (
    <div className="sa-chart" role="img" aria-label="Completed payments by day">
      {points.map((point) => {
        const height = hasRevenue ? Math.max(4, (point.revenue / max) * 100) : 4;
        return (
          <div key={point.date} className="sa-chart-col">
            <span className="sa-chart-amount">
              {hasRevenue && point.revenue > 0 ? formatMoney(point.revenue) : "—"}
            </span>
            <div className="sa-chart-track">
              <span
                className="sa-chart-bar"
                style={{ ["--bar-size" as string]: `${height}%` }}
                title={`${point.date}: ${formatMoney(point.revenue)}`}
              />
            </div>
            <span className="sa-chart-label">{weekdayLabel(point.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SuperAdminDashboardView({ data }: { data: Data }) {
  const { metrics, dateLabel, timezone } = data;
  const rangeHint = `${dateLabel} (${timezone})`;
  const activityMax = Math.max(
    metrics.registeredPatientsToday,
    metrics.visitsToday,
    data.appointmentsToday.total,
    0,
  );
  const appointmentMax = Math.max(data.appointmentsToday.total, 1);

  return (
    <div className="sa-dashboard">
      <header className="sa-hero">
        <div>
          <p className="sa-kicker">Operations</p>
          <h1>Hospital overview</h1>
          <p className="sa-hero-copy">
            Live counts for {rangeHint}. Revenue uses completed payments
            received, not invoices issued.
          </p>
        </div>
        <div className="sa-hero-meta">
          <span>Hospital day</span>
          <strong>{dateLabel}</strong>
        </div>
      </header>

      <section aria-label="Key metrics" className="sa-kpi-grid">
        <KpiCard
          label="Registered patients"
          value={metrics.registeredPatientsToday}
          hint="New records created today"
          icon={<IconUsers />}
        />
        <KpiCard
          label="Patient visits"
          value={metrics.visitsToday}
          hint="Encounters started today"
          icon={<IconVisits />}
        />
        <KpiCard
          label="Today's revenue"
          value={formatMoney(metrics.revenueToday)}
          hint="Completed payments"
          icon={<IconRevenue />}
        />
        <KpiCard
          label="Net collections"
          value={formatMoney(metrics.netCollectionsToday)}
          hint={`Refunds ${formatMoney(metrics.refundsToday)}`}
          icon={<IconCollections />}
        />
      </section>

      <div className="sa-grid-main">
        <Panel
          title="Revenue trend"
          action={
            <Link className="sa-link" href="/billing">
              Billing
            </Link>
          }
        >
          <p className="sa-panel-sub">
            Completed payments for the last seven hospital days, including
            today.
          </p>
          <RevenueChart points={data.revenueTrend} />
        </Panel>

        <Panel title="Patient activity">
          <p className="sa-panel-sub">
            Today’s registrations, visits, and scheduled appointments compared
            with each other.
          </p>
          <Meter
            label="Registered patients"
            value={metrics.registeredPatientsToday}
            max={activityMax}
            tone="teal"
          />
          <Meter
            label="Patient visits"
            value={metrics.visitsToday}
            max={activityMax}
            tone="blue"
          />
          <Meter
            label="Appointments"
            value={data.appointmentsToday.total}
            max={activityMax}
            tone="slate"
          />
          <p className="sa-outstanding">
            Open invoice balances:{" "}
            <strong>{formatMoney(metrics.outstandingBalances)}</strong>
          </p>
          <div className="sa-list-block">
            <h3>Recent registrations</h3>
            {data.recentRegistrations.length === 0 ? (
              <EmptyState
                title="No registrations today"
                description="Newly registered patients will appear here."
              />
            ) : (
              <ul className="sa-list">
                {data.recentRegistrations.map((patient) => (
                  <li key={patient.id}>
                    <div>
                      <Link className="sa-link" href={`/patients/${patient.id}`}>
                        {patient.fullName}
                      </Link>
                      <p>{patient.patientId}</p>
                    </div>
                    <time dateTime={patient.createdAt}>
                      {formatTime(patient.createdAt, timezone)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <div className="sa-grid-secondary">
        <Panel title="Appointment summary">
          <p className="sa-panel-sub">Status counts for appointments scheduled today.</p>
          <p className="sa-total">
            <strong>{data.appointmentsToday.total}</strong>
            <span>total today</span>
          </p>
          <Meter
            label="Scheduled"
            value={data.appointmentsToday.scheduled}
            max={appointmentMax}
            tone="blue"
          />
          <Meter
            label="Checked in"
            value={data.appointmentsToday.checkedIn}
            max={appointmentMax}
            tone="teal"
          />
          <Meter
            label="Completed"
            value={data.appointmentsToday.completed}
            max={appointmentMax}
            tone="slate"
          />
          <Meter
            label="Cancelled"
            value={data.appointmentsToday.cancelled}
            max={appointmentMax}
            tone="amber"
          />
          <Link className="sa-link sa-link-footer" href="/appointments">
            Open appointments
          </Link>
        </Panel>

        <Panel title="Operational alerts">
          {data.alerts.length > 0 ? (
            <ul className="sa-alerts">
              {data.alerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No operational alerts"
              description="Outstanding balances and stalled check-ins will appear here when they occur."
            />
          )}
        </Panel>

        <Panel
          title="Recent payment activity"
          action={
            <Link className="sa-link" href="/billing">
              View billing
            </Link>
          }
        >
          {data.recentPayments.length === 0 ? (
            <EmptyState
              title="No payments today"
              description="Completed and refunded payments for today will appear here."
            />
          ) : (
            <ul className="sa-list">
              {data.recentPayments.map((payment) => (
                <li key={payment.id}>
                  <div>
                    <p className="sa-pay-amount">
                      {formatMoney(payment.amount, payment.currency)}
                    </p>
                    <p className={`sa-status sa-status-${payment.status}`}>
                      {payment.status}
                    </p>
                  </div>
                  <time dateTime={payment.paidAt}>
                    {formatTime(payment.paidAt, timezone)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section className="sa-panel sa-actions">
        <header className="sa-panel-head">
          <h2>Quick actions</h2>
        </header>
        <nav className="sa-action-row" aria-label="Quick actions">
          <Link href="/users">Manage users</Link>
          <Link href="/patients">Patients</Link>
          <Link href="/patients/new">Register patient</Link>
          <Link href="/appointments">Appointments</Link>
          <Link href="/clinical">Clinical queue</Link>
          <Link href="/ipd">IPD census</Link>
          <Link href="/settings">Hospital settings</Link>
        </nav>
      </section>
    </div>
  );
}
