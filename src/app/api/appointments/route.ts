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
  listAppointments,
  listDoctors,
  scheduleAppointment,
} from "@/lib/services/appointments";
import { roleHasPermission } from "@/types/permissions";
import {
  appointmentListSchema,
  scheduleAppointmentSchema,
} from "@/lib/validations/appointment";

function serviceErrorResponse(error: unknown) {
  if (error instanceof AppointmentServiceError) {
    return fail(error.code, error.message, error.status, error.details);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!roleHasPermission(session.user.role, "appointments:read")) {
      return fail("FORBIDDEN", "Insufficient permissions", 403);
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = appointmentListSchema.safeParse(params);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Invalid list parameters",
        400,
        parsed.error.flatten(),
      );
    }

    const canManage = roleHasPermission(session.user.role, "appointments:manage");
    const scopedDoctorId =
      session.user.role === "DOCTOR" && !canManage
        ? session.user.id
        : undefined;

    // Doctors without manage can only see their own schedule.
    if (
      scopedDoctorId &&
      parsed.data.doctorId &&
      parsed.data.doctorId !== scopedDoctorId
    ) {
      return fail("FORBIDDEN", "You can only view your own appointments", 403);
    }

    const result = await listAppointments({
      ...parsed.data,
      scopedDoctorId,
    });

    const doctors =
      canManage || session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN"
        ? await listDoctors()
        : [];

    return ok(
      { ...result, doctors },
      {
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          date: result.date,
        },
      },
    );
  } catch (error) {
    return (
      authErrorResponse(error) ??
      serviceErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to list appointments", 500)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("appointments:manage");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = scheduleAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid appointment data";
      return fail("VALIDATION_ERROR", message, 400, parsed.error.flatten());
    }

    const appointment = await scheduleAppointment({
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });

    return ok({ appointment }, { status: 201 });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      serviceErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to schedule appointment", 500)
    );
  }
}
