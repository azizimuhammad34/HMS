import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  getPatientById,
  getPatientVisits,
  updatePatientDemographics,
} from "@/lib/services/patients";
import { updatePatientSchema } from "@/lib/validations/patient";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("patients:read");
    const { id } = await context.params;
    const patient = await getPatientById(id);
    if (!patient) {
      return fail("NOT_FOUND", "Patient not found", 404);
    }
    const visits = await getPatientVisits(id);
    return ok({ patient, visits });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to load patient", 500)
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("patients:update_demographics");
    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = updatePatientSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid patient data";
      return fail("VALIDATION_ERROR", message, 400, parsed.error.flatten());
    }

    const patient = await updatePatientDemographics({
      id,
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });

    if (!patient) {
      return fail("NOT_FOUND", "Patient not found", 404);
    }

    return ok({ patient });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to update patient", 500)
    );
  }
}
