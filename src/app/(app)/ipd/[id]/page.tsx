import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DischargeForm } from "@/components/ipd/DischargeForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getAdmissionById } from "@/lib/services/ipd";
import {
  formatAdmissionStatus,
  formatDischargeDisposition,
  formatIpdDateTime,
} from "@/lib/utils/ipd-display";
import { roleHasPermission } from "@/types/permissions";

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "ipd:read")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const admission = await getAdmissionById(id);
  if (!admission) notFound();

  const canDischarge =
    admission.status === "admitted" &&
    roleHasPermission(session.user.role, "ipd:discharge");
  const canOpenClinical =
    roleHasPermission(session.user.role, "clinical:notes") ||
    roleHasPermission(session.user.role, "clinical:diagnosis");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/ipd" className="text-[var(--color-primary)] hover:underline">
            IPD
          </Link>
          {" / "}
          {admission.patientDisplayId}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              {admission.patientName}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {formatAdmissionStatus(admission.status)}
              {" · "}
              {admission.bedCode} ({admission.ward} / {admission.room}-{admission.bedNumber})
              {" · Admitted "}
              {formatIpdDateTime(admission.admittedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href={`/patients/${admission.patientId}`}
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Patient profile
            </Link>
            {canOpenClinical ? (
              <Link
                href={`/clinical/${admission.encounterId}`}
                className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Clinical chart
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <section
        aria-label="Admission details"
        className="grid gap-4 border-y border-[var(--color-border)] py-4 sm:grid-cols-2"
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Reason
          </p>
          <p className="mt-1 text-sm font-medium">
            {admission.reason ?? "Not recorded"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Admitting doctor
          </p>
          <p className="mt-1 text-sm font-medium">
            {admission.admittingDoctorName ?? "Unassigned"}
          </p>
        </div>
        {admission.status === "discharged" ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Discharged
              </p>
              <p className="mt-1 text-sm font-medium">
                {admission.dischargedAt
                  ? formatIpdDateTime(admission.dischargedAt)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Disposition
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatDischargeDisposition(admission.dischargeDisposition)}
              </p>
            </div>
            {admission.dischargeSummary ? (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  Discharge summary
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {admission.dischargeSummary}
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {canDischarge ? (
        <section className="space-y-3 border-t border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Discharge
          </h2>
          <DischargeForm admissionId={admission.id} />
        </section>
      ) : null}
    </div>
  );
}
