import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  AppointmentServiceError,
  checkInAppointment,
} from "@/lib/services/appointments";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("appointments:check_in");
    const { id } = await context.params;

    const result = await checkInAppointment({
      id,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AppointmentServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to check in appointment", 500)
    );
  }
}
