import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { roleHasPermission } from "@/types/permissions";

export default async function ReportsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "reports:read")) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Reports</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Hospital reports and summaries.</p>
      </div>
      <ul className="space-y-2 text-sm text-[var(--color-text)]">
        <li>• Patients registered</li>
        <li>• Appointments</li>
        <li>• OPD/IPD encounters</li>
        <li>• Billing summary</li>
        <li>• Pharmacy dispenses</li>
        <li>• Lab orders</li>
        <li>• Radiology orders</li>
      </ul>
    </div>
  );
}
