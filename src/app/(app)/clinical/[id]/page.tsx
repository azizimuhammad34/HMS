import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClinicalNoteForm } from "@/components/clinical/ClinicalNoteForm";
import { DiagnosisForm } from "@/components/clinical/DiagnosisForm";
import { EncounterActions } from "@/components/clinical/EncounterActions";
import { PrescriptionForm } from "@/components/clinical/PrescriptionForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  ClinicalServiceError,
  getEncounterDetail,
} from "@/lib/services/clinical";
import {
  canAccessClinical,
  formatDiagnosisKind,
  formatEncounterStatus,
  formatEncounterTime,
} from "@/lib/utils/clinical-display";
import { roleHasPermission } from "@/types/permissions";

export default async function EncounterWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!canAccessClinical(session.user.role)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  let detail;
  try {
    detail = await getEncounterDetail(id, {
      id: session.user.id,
      role: session.user.role,
    });
  } catch (error) {
    if (error instanceof ClinicalServiceError && error.status === 404) {
      notFound();
    }
    if (error instanceof ClinicalServiceError && error.status === 403) {
      redirect("/clinical");
    }
    throw error;
  }

  const { encounter, notes, diagnoses, prescriptions } = detail;
  const writable =
    encounter.status === "checked_in" ||
    encounter.status === "in_consultation";
  const canNotes = roleHasPermission(session.user.role, "clinical:notes");
  const canDiagnosis = roleHasPermission(
    session.user.role,
    "clinical:diagnosis",
  );
  const canRx = roleHasPermission(
    session.user.role,
    "clinical:prescriptions",
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link
            href="/clinical"
            className="text-[var(--color-primary)] hover:underline"
          >
            Clinical
          </Link>
          {" / "}
          {encounter.patientDisplayId}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              {encounter.patientName}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {formatEncounterStatus(encounter.status)}
              {" · Started "}
              {formatEncounterTime(encounter.startedAt)}
              {encounter.doctorName ? ` · ${encounter.doctorName}` : ""}
            </p>
          </div>
          <Link
            href={`/patients/${encounter.patientId}`}
            className="text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Patient profile
          </Link>
        </div>
        {canNotes ? (
          <div className="mt-4">
            <EncounterActions
              encounterId={encounter.id}
              status={encounter.status}
            />
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Clinical notes
        </h2>
        {notes.length === 0 ? (
          <EmptyState
            title="No notes yet"
            description="Record chief complaint, examination, assessment, and plan."
          />
        ) : (
          <ul className="space-y-4">
            {notes.map((note) => (
              <li
                key={note.id}
                className="border-t border-[var(--color-border)] pt-3 text-sm"
              >
                <p className="text-xs text-[var(--color-text-muted)]">
                  {note.authorName} · {formatEncounterTime(note.createdAt)} ·{" "}
                  {note.noteType}
                </p>
                {note.chiefComplaint ? (
                  <p className="mt-2">
                    <span className="font-medium">Complaint: </span>
                    {note.chiefComplaint}
                  </p>
                ) : null}
                {note.history ? (
                  <p className="mt-1">
                    <span className="font-medium">History: </span>
                    {note.history}
                  </p>
                ) : null}
                {note.examination ? (
                  <p className="mt-1">
                    <span className="font-medium">Exam: </span>
                    {note.examination}
                  </p>
                ) : null}
                {note.assessment ? (
                  <p className="mt-1">
                    <span className="font-medium">Assessment: </span>
                    {note.assessment}
                  </p>
                ) : null}
                {note.plan ? (
                  <p className="mt-1">
                    <span className="font-medium">Plan: </span>
                    {note.plan}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {writable && canNotes ? (
          <div className="border-t border-[var(--color-border)] pt-4">
            <ClinicalNoteForm encounterId={encounter.id} />
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Diagnoses
        </h2>
        {diagnoses.length === 0 ? (
          <EmptyState
            title="No diagnoses recorded"
            description="Add a primary or secondary diagnosis for this visit."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {diagnoses.map((dx) => (
              <li key={dx.id} className="py-2.5 text-sm">
                <p className="font-medium">
                  {dx.description}
                  {dx.code ? (
                    <span className="ml-2 font-normal text-[var(--color-text-muted)]">
                      ({dx.code})
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {formatDiagnosisKind(dx.kind)} · {dx.recordedByName} ·{" "}
                  {formatEncounterTime(dx.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {writable && canDiagnosis ? (
          <div className="border-t border-[var(--color-border)] pt-4">
            <DiagnosisForm encounterId={encounter.id} />
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Prescriptions
        </h2>
        {prescriptions.length === 0 ? (
          <EmptyState
            title="No prescriptions"
            description="Prescribe medications for this encounter."
          />
        ) : (
          <ul className="space-y-4">
            {prescriptions.map((rx) => (
              <li
                key={rx.id}
                className="border-t border-[var(--color-border)] pt-3 text-sm"
              >
                <p className="text-xs text-[var(--color-text-muted)]">
                  {rx.doctorName} · {formatEncounterTime(rx.prescribedAt)} ·{" "}
                  {rx.status}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {rx.items.map((item, idx) => (
                    <li key={`${rx.id}-${idx}`}>
                      <span className="font-medium">{item.medication}</span>
                      {[item.dosage, item.frequency, item.duration]
                        .filter(Boolean)
                        .join(" · ")
                        ? ` — ${[item.dosage, item.frequency, item.duration]
                            .filter(Boolean)
                            .join(" · ")}`
                        : ""}
                      {item.instructions ? (
                        <span className="text-[var(--color-text-muted)]">
                          {" "}
                          ({item.instructions})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {rx.notes ? (
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    {rx.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {writable && canRx ? (
          <div className="border-t border-[var(--color-border)] pt-4">
            <PrescriptionForm encounterId={encounter.id} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
