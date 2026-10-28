import { redirect } from "next/navigation";
import { RoleDashboardView } from "@/components/dashboard/RoleDashboard";
import { SuperAdminDashboardView } from "@/components/dashboard/SuperAdminDashboard";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  getRoleDashboardSummary,
  getSuperAdminDashboard,
} from "@/lib/services/dashboard";

export default async function DashboardPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "SUPER_ADMIN") {
    const data = await getSuperAdminDashboard();
    return <SuperAdminDashboardView data={data} />;
  }

  const data = await getRoleDashboardSummary(
    session.user.role,
    session.user.id,
  );
  return <RoleDashboardView data={data} />;
}
