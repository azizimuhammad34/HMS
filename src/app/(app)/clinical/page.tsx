import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EncounterQueueFilter } from "@/components/clinical/EncounterQueueFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listEncounters } from "@/lib/services/clinical";
import {
  canAccessClinical,
  formatEncounterClock,
  formatEncounterStatus,
} from "@/lib/utils/clinical-display";
import { toHospitalDateLabel } from "@/lib/utils/date";
import { encounterListSchema } from "@/lib/validations/clinical";

export default async function ClinicalQueuePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!canAccessClinical(session.user.role)) {
    redirect("/dashboard");
  }

  const raw = await searchParams;
  const parsed = encounterListSchema.parse({
    date: raw.date || undefined,
    status: raw.status || undefined,
    page: raw.page ?? "1",
  });

  const scopedDoctorId =
    session.user.role === "DOCTOR" ? session.user.id : undefined;

  const result = await listEncounters({
    ...parsed,
    date: parsed.date ?? toHospitalDateLabel(),
    scopedDoctorId,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          Clinical queue
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {session.user.role === "DOCTOR"
            ? "Checked-in patients waiting for or in consultation with you."
            : "OPD encounters for the selected hospital day (Asia/Karachi)."}
        </p>
      </div>

      <Suspense fallback={null}>
        <EncounterQueueFilter
          initialDate={result.date}
          initialStatus={parsed.status}
        />
      </Suspense>

      {result.encounters.length === 0 ? (
        <EmptyState
          title="No encounters in queue"
          description="Check patients in from Appointments, or pick another date."
        />
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {result.encounters.map((enc) => (
            <li
              key={enc.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <Link
                  href={`/clinical/${enc.id}`}
                  className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  {enc.patientName}
                </Link>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {enc.patientDisplayId}
                  {" · "}
                  {formatEncounterClock(enc.startedAt)}
                  {" · "}
                  {formatEncounterStatus(enc.status)}
                  {enc.doctorName ? ` · ${enc.doctorName}` : ""}
                </p>
              </div>
              <Link
                href={`/clinical/${enc.id}`}
                className="text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Open visit
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          Page {result.page} of {totalPages} · {result.total} encounters
        </p>
      ) : null}
    </div>
  );
}
