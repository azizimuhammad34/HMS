import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  ClinicalServiceError,
  addPrescription,
} from "@/lib/services/clinical";
import { prescriptionSchema } from "@/lib/validations/clinical";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("clinical:prescriptions");
    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = prescriptionSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid prescription",
        400,
        parsed.error.flatten(),
      );
    }

    const prescription = await addPrescription({
      encounterId: id,
      input: parsed.data,
      actor: { id: session.user.id, role: session.user.role },
      ipAddress: getClientIp(request),
    });

    return ok({ prescription }, { status: 201 });
  } catch (error) {
    if (error instanceof ClinicalServiceError) {
      return fail(error.code, error.message, error.status);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to save prescription", 500)
    );
  }
}
