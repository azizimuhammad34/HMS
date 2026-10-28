import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PatientSearch } from "@/components/patients/PatientSearch";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionFromCookies } from "@/lib/auth/session";
import { searchPatients } from "@/lib/services/patients";
import {
  calculateAge,
  formatRegisteredAt,
  formatSex,
} from "@/lib/utils/patient-display";
import { roleHasPermission } from "@/types/permissions";
import { patientSearchSchema } from "@/lib/validations/patient";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "patients:read")) {
    redirect("/dashboard");
  }

  const raw = await searchParams;
  const parsed = patientSearchSchema.parse({
    q: raw.q ?? "",
    page: raw.page ?? "1",
  });
  const result = await searchPatients(parsed);
  const canRegister = roleHasPermission(session.user.role, "patients:register");
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            Patients
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Search and open patient records. Patient IDs are permanent once
            assigned.
          </p>
        </div>
        {canRegister ? (
          <Link href="/patients/new">
            <Button type="button">Register patient</Button>
          </Link>
        ) : null}
      </div>

      <Suspense fallback={null}>
        <PatientSearch initialQuery={parsed.q} />
      </Suspense>

      {result.patients.length === 0 ? (
        <EmptyState
          title={parsed.q ? "No matching patients" : "No patients registered yet"}
          description={
            canRegister
              ? "Register a patient to begin building the hospital record."
              : "No patient records are available for your search."
          }
        />
      ) : (
        <div className="overflow-x-auto border-t border-[var(--color-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="py-2 pr-4 font-medium">Patient ID</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Sex / Age</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.patients.map((p) => {
                const age = calculateAge(p.dateOfBirth);
                return (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/patients/${p.id}`}
                        className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                      >
                        {p.patientId}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 font-medium">{p.fullName}</td>
                    <td className="py-2.5 pr-4 text-[var(--color-text-muted)]">
                      {formatSex(p.sex)}
                      {age != null ? ` · ${age}y` : ""}
                    </td>
                    <td className="py-2.5 pr-4">{p.phone ?? "—"}</td>
                    <td className="py-2.5 text-[var(--color-text-muted)]">
                      {formatRegisteredAt(p.registeredAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center gap-3 text-sm">
          {parsed.page > 1 ? (
            <Link
              className="text-[var(--color-primary)] hover:underline"
              href={`/patients?q=${encodeURIComponent(parsed.q)}&page=${parsed.page - 1}`}
            >
              Previous
            </Link>
          ) : null}
          <span className="text-[var(--color-text-muted)]">
            Page {parsed.page} of {totalPages} · {result.total} total
          </span>
          {parsed.page < totalPages ? (
            <Link
              className="text-[var(--color-primary)] hover:underline"
              href={`/patients?q=${encodeURIComponent(parsed.q)}&page=${parsed.page + 1}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
