import { fail, ok } from "@/lib/api-response";
import { authErrorResponse, requirePermission } from "@/lib/auth/authorize";
import { listDoctors } from "@/lib/services/appointments";

export async function GET() {
  try {
    await requirePermission("appointments:manage");
    const doctors = await listDoctors();
    return ok({ doctors });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to list doctors", 500)
    );
  }
}
