import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PatientEditForm } from "@/components/patients/PatientEditForm";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getPatientClinicalHistory } from "@/lib/services/clinical";
import { getActiveAdmissionForPatient } from "@/lib/services/ipd";
import {
  getPatientById,
  getPatientVisits,
} from "@/lib/services/patients";
import { formatIpdDateTime } from "@/lib/utils/ipd-display";
import {
  canAccessClinical,
  formatDiagnosisKind,
  formatEncounterStatus,
  formatEncounterTime,
} from "@/lib/utils/clinical-display";
import {
  calculateAge,
  formatRegisteredAt,
  formatSex,
} from "@/lib/utils/patient-display";
import { roleHasPermission } from "@/types/permissions";

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "patients:read")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const patient = await getPatientById(id);
  if (!patient) notFound();

  const [visits, clinicalHistory, activeAdmission] = await Promise.all([
    getPatientVisits(id),
    getPatientClinicalHistory(id),
    getActiveAdmissionForPatient(id),
  ]);
  const canEdit = roleHasPermission(
    session.user.role,
    "patients:update_demographics",
  );
  const canSchedule = roleHasPermission(
    session.user.role,
    "appointments:manage",
  );
  const canRecordVitals = roleHasPermission(session.user.role, "clinical:vitals");
  const canAddNursingNote = roleHasPermission(
    session.user.role,
    "clinical:nursing_notes",
  );
  const canAdmit =
    roleHasPermission(session.user.role, "ipd:admit") && !activeAdmission;
  const canOpenClinical = canAccessClinical(session.user.role);
  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/patients" className="text-[var(--color-primary)] hover:underline">
            Patients
          </Link>
          {" / "}
          {patient.patientId}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              {patient.fullName}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Patient ID {patient.patientId} · Registered{" "}
              {formatRegisteredAt(patient.registeredAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSchedule ? (
              <Link href={`/appointments/new?patientId=${patient.id}`}>
                <Button type="button" variant="secondary">
                  Schedule appointment
                </Button>
              </Link>
            ) : null}
            {canRecordVitals ? (
              <Link href={`/nursing/vitals?patientId=${patient.id}${activeAdmission ? `&admissionId=${activeAdmission.id}` : ""}${(clinicalHistory as any).active?.encounterId ? `&encounterId=${(clinicalHistory as any).active.encounterId}` : ""}`}>
                <Button type="button" variant="secondary">
                  Record vitals
                </Button>
              </Link>
            ) : null}
            {canAddNursingNote ? (
              <Link href={`/nursing/notes?patientId=${patient.id}${activeAdmission ? `&admissionId=${activeAdmission.id}` : ""}${(clinicalHistory as any).active?.encounterId ? `&encounterId=${(clinicalHistory as any).active.encounterId}` : ""}`}>
                <Button type="button" variant="secondary">
                  Add nursing note
                </Button>
              </Link>
            ) : null}
            {canAdmit ? (
              <Link href={`/ipd/admit?patientId=${patient.id}`}>
                <Button type="button">Admit to ward</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {activeAdmission ? (
        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--color-text)]">
            Currently admitted · {activeAdmission.bedCode} (
            {activeAdmission.ward} / {activeAdmission.room}-
            {activeAdmission.bedNumber})
          </p>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Since {formatIpdDateTime(activeAdmission.admittedAt)}
            {" · "}
            <Link
              href={`/ipd/${activeAdmission.id}`}
              className="text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Open admission
            </Link>
          </p>
        </section>
      ) : null}

      <section
        aria-label="Demographics"
        className="grid gap-4 border-y border-[var(--color-border)] py-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Sex
          </p>
          <p className="mt-1 text-sm font-medium">{formatSex(patient.sex)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Date of birth / age
          </p>
          <p className="mt-1 text-sm font-medium">
            {patient.dateOfBirth ?? "Not recorded"}
            {age != null ? ` (${age} years)` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Phone
          </p>
          <p className="mt-1 text-sm font-medium">{patient.phone ?? "—"}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Address
          </p>
          <p className="mt-1 text-sm font-medium">{patient.address ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Emergency contact
          </p>
          <p className="mt-1 text-sm font-medium">
            {patient.emergencyContactName ?? "—"}
            {patient.emergencyContactPhone
              ? ` · ${patient.emergencyContactPhone}`
              : ""}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Visits
        </h2>
        {visits.length === 0 ? (
          <EmptyState
            title="No visits recorded"
            description="Patient visits will appear here when encounters are created."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {visits.map((v) => (
              <li key={v.id} className="flex justify-between py-2.5 text-sm">
                <div>
                  {canOpenClinical ? (
                    <Link
                      href={`/clinical/${v.id}`}
                      className="font-medium capitalize text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      {v.type} visit
                    </Link>
                  ) : (
                    <p className="font-medium capitalize">{v.type} visit</p>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {formatEncounterStatus(v.status)}
                  </p>
                </div>
                <time className="text-xs text-[var(--color-text-muted)]">
                  {formatRegisteredAt(v.startedAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Medical history
        </h2>
        {clinicalHistory.encounters.length === 0 ? (
          <EmptyState
            title="No clinical history yet"
            description="Consultations, diagnoses, and prescriptions appear here after OPD visits are documented."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {clinicalHistory.encounters.map((enc) => (
              <li key={enc.id} className="space-y-1.5 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    {canOpenClinical ? (
                      <Link
                        href={`/clinical/${enc.id}`}
                        className="font-medium capitalize text-[var(--color-primary)] underline-offset-2 hover:underline"
                      >
                        {enc.type} · {formatEncounterStatus(enc.status)}
                      </Link>
                    ) : (
                      <p className="font-medium capitalize">
                        {enc.type} · {formatEncounterStatus(enc.status)}
                      </p>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {enc.doctorName ? `${enc.doctorName} · ` : ""}
                      {formatEncounterTime(enc.startedAt)}
                    </p>
                  </div>
                </div>
                {enc.latestNoteSummary ? (
                  <p className="text-[var(--color-text-muted)]">
                    {enc.latestNoteSummary}
                  </p>
                ) : null}
                {enc.diagnoses.length > 0 ? (
                  <p>
                    <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      Dx:{" "}
                    </span>
                    {enc.diagnoses
                      .map(
                        (d) =>
                          `${d.description}${d.code ? ` (${d.code})` : ""} [${formatDiagnosisKind(d.kind)}]`,
                      )
                      .join("; ")}
                  </p>
                ) : null}
                {enc.prescriptions.length > 0 ? (
                  <p>
                    <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      Rx:{" "}
                    </span>
                    {enc.prescriptions
                      .map((p) => p.medications.join(", "))
                      .join("; ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canEdit ? (
        <section className="space-y-3 border-t border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Edit demographics
          </h2>
          <PatientEditForm patient={patient} />
        </section>
      ) : null}
    </div>
  );
}
