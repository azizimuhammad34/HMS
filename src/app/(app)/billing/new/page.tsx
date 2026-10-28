import Link from "next/link";
import { redirect } from "next/navigation";
import { InvoiceCreateForm } from "@/components/billing/InvoiceCreateForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { roleHasPermission } from "@/types/permissions";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; encounterId?: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "billing:create_invoice")) {
    redirect("/billing");
  }

  const { patientId, encounterId } = await searchParams;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link
            href="/billing"
            className="text-[var(--color-primary)] hover:underline"
          >
            Billing
          </Link>
          {" / New invoice"}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">
          Create invoice
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Issue an invoice for a patient. Record payments from the invoice page.
        </p>
      </div>

      <InvoiceCreateForm
        initialPatientId={patientId}
        initialEncounterId={encounterId}
      />
    </div>
  );
}
