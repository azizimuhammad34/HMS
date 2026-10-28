import Link from "next/link";
import { redirect } from "next/navigation";
import { BedCreateForm } from "@/components/ipd/BedCreateForm";
import { BedStatusActions } from "@/components/ipd/BedStatusActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listBeds } from "@/lib/services/ipd";
import { formatBedStatus } from "@/lib/utils/ipd-display";
import { roleHasPermission } from "@/types/permissions";

export default async function IpdBedsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "ipd:read")) {
    redirect("/dashboard");
  }

  const canManage = roleHasPermission(session.user.role, "ipd:manage_beds");
  const beds = await listBeds({});

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/ipd" className="text-[var(--color-primary)] hover:underline">
            IPD
          </Link>
          {" / Beds"}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">
          Bed board
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Ward inventory and availability.
        </p>
      </div>

      {beds.length === 0 ? (
        <EmptyState
          title="No beds configured"
          description={
            canManage
              ? "Add beds below so reception can admit inpatients."
              : "Ask an administrator to configure ward beds."
          }
        />
      ) : (
        <div className="overflow-x-auto border-t border-[var(--color-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="py-2 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium">Ward</th>
                <th className="py-2 pr-4 font-medium">Room / bed</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                {canManage ? (
                  <th className="py-2 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {beds.map((bed) => (
                <tr key={bed.id}>
                  <td className="py-3 pr-4 font-medium">{bed.code}</td>
                  <td className="py-3 pr-4">{bed.ward}</td>
                  <td className="py-3 pr-4">
                    {bed.room} / {bed.bedNumber}
                  </td>
                  <td className="py-3 pr-4">
                    {formatBedStatus(bed.status)}
                    {bed.currentAdmissionId ? (
                      <>
                        {" · "}
                        <Link
                          href={`/ipd/${bed.currentAdmissionId}`}
                          className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                        >
                          Admission
                        </Link>
                      </>
                    ) : null}
                  </td>
                  {canManage ? (
                    <td className="py-3">
                      <BedStatusActions bedId={bed.id} status={bed.status} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage ? (
        <section className="space-y-3 border-t border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Add bed
          </h2>
          <BedCreateForm />
        </section>
      ) : null}
    </div>
  );
}
