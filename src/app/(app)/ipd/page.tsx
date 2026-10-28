import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { IpdCensusFilter } from "@/components/ipd/IpdCensusFilter";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  getBedOccupancySummary,
  listAdmissions,
  listWards,
} from "@/lib/services/ipd";
import {
  formatAdmissionStatus,
  formatIpdDateTime,
} from "@/lib/utils/ipd-display";
import { roleHasPermission } from "@/types/permissions";
import { admissionListSchema } from "@/lib/validations/ipd";

export default async function IpdCensusPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    ward?: string;
    page?: string;
  }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "ipd:read")) {
    redirect("/dashboard");
  }

  const raw = await searchParams;
  const parsed = admissionListSchema.parse({
    status: raw.status || undefined,
    ward: raw.ward || undefined,
    page: raw.page ?? "1",
  });

  const canAdmit = roleHasPermission(session.user.role, "ipd:admit");
  const canManageBeds = roleHasPermission(
    session.user.role,
    "ipd:manage_beds",
  );

  const [result, occupancy, wards] = await Promise.all([
    listAdmissions(parsed),
    getBedOccupancySummary(),
    listWards(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            Inpatient census
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Admissions, bed occupancy, and discharge.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageBeds ? (
            <Link href="/ipd/beds">
              <Button type="button" variant="secondary">
                Beds
              </Button>
            </Link>
          ) : (
            <Link href="/ipd/beds">
              <Button type="button" variant="secondary">
                Bed board
              </Button>
            </Link>
          )}
          {canAdmit ? (
            <Link href="/ipd/admit">
              <Button type="button">Admit patient</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <section
        aria-label="Occupancy"
        className="space-y-4 border-y border-[var(--color-border)] py-4"
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Beds
            </p>
            <p className="mt-1 text-lg font-semibold">{occupancy.totalActive}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Available
            </p>
            <p className="mt-1 text-lg font-semibold">{occupancy.available}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Occupied
            </p>
            <p className="mt-1 text-lg font-semibold">{occupancy.occupied}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Maintenance
            </p>
            <p className="mt-1 text-lg font-semibold">{occupancy.maintenance}</p>
          </div>
        </div>
        {occupancy.byWard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <caption className="sr-only">Bed occupancy by ward</caption>
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  <th className="py-2 pr-4 font-medium">Ward</th>
                  <th className="py-2 pr-4 font-medium">Beds</th>
                  <th className="py-2 pr-4 font-medium">Available</th>
                  <th className="py-2 pr-4 font-medium">Occupied</th>
                  <th className="py-2 font-medium">Maintenance</th>
                </tr>
              </thead>
              <tbody>
                {occupancy.byWard.map((ward) => (
                  <tr
                    key={ward.ward}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="py-2 pr-4 font-medium text-[var(--color-text)]">
                      {ward.ward}
                    </td>
                    <td className="py-2 pr-4 text-[var(--color-text)]">
                      {ward.total}
                    </td>
                    <td className="py-2 pr-4 text-[var(--color-text)]">
                      {ward.available}
                    </td>
                    <td className="py-2 pr-4 text-[var(--color-text)]">
                      {ward.occupied}
                    </td>
                    <td className="py-2 text-[var(--color-text)]">
                      {ward.maintenance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <Suspense fallback={null}>
        <IpdCensusFilter
          wards={wards}
          initialWard={parsed.ward}
          initialStatus={parsed.status}
        />
      </Suspense>

      {result.admissions.length === 0 ? (
        <EmptyState
          title="No admissions match"
          description={
            canAdmit
              ? "Admit a patient or change the ward/status filter."
              : "Nothing to show for this filter."
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {result.admissions.map((adm) => (
            <li
              key={adm.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <Link
                  href={`/ipd/${adm.id}`}
                  className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  {adm.patientName}
                </Link>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {adm.patientDisplayId}
                  {" · "}
                  {adm.bedCode} ({adm.ward} / {adm.room}-{adm.bedNumber})
                  {" · "}
                  {formatAdmissionStatus(adm.status)}
                  {" · "}
                  {formatIpdDateTime(adm.admittedAt)}
                </p>
              </div>
              <Link
                href={`/ipd/${adm.id}`}
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
              href={`/ipd?${new URLSearchParams({
                ...(parsed.status ? { status: parsed.status } : {}),
                ...(parsed.ward ? { ward: parsed.ward } : {}),
                page: String(parsed.page - 1),
              }).toString()}`}
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-xs text-[var(--color-text-muted)]">
            Page {result.page} of {totalPages} · {result.total} admissions
          </span>
          {parsed.page < totalPages ? (
            <Link
              href={`/ipd?${new URLSearchParams({
                ...(parsed.status ? { status: parsed.status } : {}),
                ...(parsed.ward ? { ward: parsed.ward } : {}),
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
