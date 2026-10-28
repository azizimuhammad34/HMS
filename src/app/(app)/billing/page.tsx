import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { InvoiceListFilter } from "@/components/billing/InvoiceListFilter";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listInvoices } from "@/lib/services/billing";
import {
  formatBillingDateTime,
  formatInvoiceStatus,
  formatMoney,
} from "@/lib/utils/billing-display";
import { roleHasPermission } from "@/types/permissions";
import { invoiceListSchema } from "@/lib/validations/billing";

export default async function BillingListPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    patientId?: string;
    page?: string;
  }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "billing:read")) {
    redirect("/dashboard");
  }

  const raw = await searchParams;
  const parsed = invoiceListSchema.parse({
    status: raw.status || "open",
    q: raw.q || undefined,
    patientId: raw.patientId || undefined,
    page: raw.page ?? "1",
  });

  const canCreate = roleHasPermission(
    session.user.role,
    "billing:create_invoice",
  );
  const result = await listInvoices(parsed);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            Billing
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Invoices, payments, and refunds. Revenue counts completed payments.
          </p>
        </div>
        {canCreate ? (
          <Link href="/billing/new">
            <Button type="button">New invoice</Button>
          </Link>
        ) : null}
      </div>

      <Suspense fallback={null}>
        <InvoiceListFilter
          initialStatus={parsed.status ?? "open"}
          initialQ={parsed.q}
        />
      </Suspense>

      {result.invoices.length === 0 ? (
        <EmptyState
          title="No invoices match"
          description={
            canCreate
              ? "Create an invoice or change the status/search filter."
              : "Nothing to show for this filter."
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {result.invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <Link
                  href={`/billing/${inv.id}`}
                  className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  {inv.invoiceNumber}
                </Link>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {inv.patientName} ({inv.patientDisplayId})
                  {" · "}
                  {formatInvoiceStatus(inv.status)}
                  {" · "}
                  {formatMoney(inv.totalAmount, inv.currency)}
                  {inv.outstanding > 0
                    ? ` · Outstanding ${formatMoney(inv.outstanding, inv.currency)}`
                    : ""}
                  {" · "}
                  {formatBillingDateTime(inv.issuedAt)}
                </p>
              </div>
              <Link
                href={`/billing/${inv.id}`}
                className="text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {parsed.page > 1 ? (
            <Link
              href={`/billing?${new URLSearchParams({
                ...(parsed.status ? { status: parsed.status } : {}),
                ...(parsed.q ? { q: parsed.q } : {}),
                ...(parsed.patientId ? { patientId: parsed.patientId } : {}),
                page: String(parsed.page - 1),
              }).toString()}`}
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-xs text-[var(--color-text-muted)]">
            Page {result.page} of {totalPages} · {result.total} invoices
          </span>
          {parsed.page < totalPages ? (
            <Link
              href={`/billing?${new URLSearchParams({
                ...(parsed.status ? { status: parsed.status } : {}),
                ...(parsed.q ? { q: parsed.q } : {}),
                ...(parsed.patientId ? { patientId: parsed.patientId } : {}),
                page: String(parsed.page + 1),
              }).toString()}`}
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
