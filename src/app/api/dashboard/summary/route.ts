import { fail, ok } from "@/lib/api-response";
import { authErrorResponse, requireSession } from "@/lib/auth/authorize";
import {
  getRoleDashboardSummary,
  getSuperAdminDashboard,
} from "@/lib/services/dashboard";

export async function GET() {
  try {
    const session = await requireSession();

    if (session.user.role === "SUPER_ADMIN") {
      const data = await getSuperAdminDashboard();
      return ok({ role: "SUPER_ADMIN" as const, dashboard: data });
    }

    const data = await getRoleDashboardSummary(
      session.user.role,
      session.user.id,
    );
    return ok({ role: session.user.role, dashboard: data });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to load dashboard", 500)
    );
  }
}
