import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  AppointmentServiceError,
  cancelAppointment,
} from "@/lib/services/appointments";
import { cancelAppointmentSchema } from "@/lib/validations/appointment";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("appointments:manage");
    const { id } = await context.params;

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = cancelAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Invalid cancel request",
        400,
        parsed.error.flatten(),
      );
    }

    const appointment = await cancelAppointment({
      id,
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });

    return ok({ appointment });
  } catch (error) {
    if (error instanceof AppointmentServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to cancel appointment", 500)
    );
  }
}
