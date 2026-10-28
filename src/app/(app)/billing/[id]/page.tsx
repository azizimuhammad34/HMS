import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RecordPaymentForm } from "@/components/billing/RecordPaymentForm";
import { RefundPaymentButton } from "@/components/billing/RefundPaymentButton";
import { VoidInvoiceButton } from "@/components/billing/VoidInvoiceButton";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getInvoiceDetail } from "@/lib/services/billing";
import {
  formatBillingDateTime,
  formatInvoiceStatus,
  formatMoney,
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/utils/billing-display";
import { roleHasPermission } from "@/types/permissions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "billing:read")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const invoice = await getInvoiceDetail(id);
  if (!invoice) notFound();

  const canPay =
    invoice.outstanding > 0 &&
    invoice.status !== "void" &&
    roleHasPermission(session.user.role, "billing:record_payment");
  const canVoid =
    invoice.amountPaid === 0 &&
    invoice.status !== "void" &&
    roleHasPermission(session.user.role, "billing:void");
  const canRefund = roleHasPermission(session.user.role, "billing:refund");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link
            href="/billing"
            className="text-[var(--color-primary)] hover:underline"
          >
            Billing
          </Link>
          {" / "}
          {invoice.invoiceNumber}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              {invoice.invoiceNumber}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {formatInvoiceStatus(invoice.status)}
              {" · Issued "}
              {formatBillingDateTime(invoice.issuedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href={`/patients/${invoice.patientId}`}
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              {invoice.patientName} ({invoice.patientDisplayId})
            </Link>
            {invoice.encounterId ? (
              <Link
                href={`/clinical/${invoice.encounterId}`}
                className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Linked encounter
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <section
        aria-label="Invoice amounts"
        className="grid gap-4 border-y border-[var(--color-border)] py-4 sm:grid-cols-3"
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Total
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatMoney(invoice.totalAmount, invoice.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Paid
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatMoney(invoice.amountPaid, invoice.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Outstanding
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatMoney(invoice.outstanding, invoice.currency)}
          </p>
        </div>
      </section>

      {canPay ? (
        <section className="max-w-md space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Record payment
          </h2>
          <RecordPaymentForm
            invoiceId={invoice.id}
            outstanding={invoice.outstanding}
            currency={invoice.currency}
          />
        </section>
      ) : null}

      {canVoid ? (
        <section>
          <VoidInvoiceButton invoiceId={invoice.id} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Payments
        </h2>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {invoice.payments.map((payment) => {
              const refundsOfThis = invoice.payments.filter(
                (p) =>
                  p.status === "refunded" &&
                  p.refundOfPaymentId === payment.id,
              );
              const refundedTotal = refundsOfThis.reduce(
                (sum, p) => sum + p.amount,
                0,
              );
              const showRefund =
                canRefund &&
                payment.status === "completed" &&
                refundedTotal < payment.amount - 0.0001;

              return (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      {formatMoney(payment.amount, payment.currency)}
                      {" · "}
                      {formatPaymentStatus(payment.status)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatPaymentMethod(payment.method)}
                      {" · "}
                      {formatBillingDateTime(payment.paidAt)}
                      {payment.refundOfPaymentId
                        ? " · Refund of prior payment"
                        : ""}
                      {payment.notes ? ` · ${payment.notes}` : ""}
                    </p>
                  </div>
                  {showRefund ? (
                    <RefundPaymentButton
                      paymentId={payment.id}
                      amount={payment.amount - refundedTotal}
                      currency={payment.currency}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
