import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
  requireSession,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  AppointmentServiceError,
  getAppointmentById,
  rescheduleAppointment,
} from "@/lib/services/appointments";
import { roleHasPermission } from "@/types/permissions";
import { rescheduleAppointmentSchema } from "@/lib/validations/appointment";

type RouteContext = { params: Promise<{ id: string }> };

function serviceErrorResponse(error: unknown) {
  if (error instanceof AppointmentServiceError) {
    return fail(error.code, error.message, error.status, error.details);
  }
  return null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession();
    if (!roleHasPermission(session.user.role, "appointments:read")) {
      return fail("FORBIDDEN", "Insufficient permissions", 403);
    }

    const { id } = await context.params;
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return fail("NOT_FOUND", "Appointment not found", 404);
    }

    if (
      session.user.role === "DOCTOR" &&
      !roleHasPermission(session.user.role, "appointments:manage") &&
      appointment.doctorId !== session.user.id
    ) {
      return fail("FORBIDDEN", "You can only view your own appointments", 403);
    }

    return ok({ appointment });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      serviceErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to load appointment", 500)
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("appointments:manage");
    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = rescheduleAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid appointment data";
      return fail("VALIDATION_ERROR", message, 400, parsed.error.flatten());
    }

    const appointment = await rescheduleAppointment({
      id,
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });

    return ok({ appointment });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      serviceErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to reschedule appointment", 500)
    );
  }
}
