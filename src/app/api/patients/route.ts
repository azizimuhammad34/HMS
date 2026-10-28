import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import { registerPatient, searchPatients } from "@/lib/services/patients";
import {
  patientSearchSchema,
  registerPatientSchema,
} from "@/lib/validations/patient";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("patients:read");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = patientSearchSchema.safeParse(params);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Invalid search parameters", 400, parsed.error.flatten());
    }

    const result = await searchPatients(parsed.data);
    return ok(result, {
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to search patients", 500)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("patients:register");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = registerPatientSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid patient data";
      return fail("VALIDATION_ERROR", message, 400, parsed.error.flatten());
    }

    const result = await registerPatient({
      input: parsed.data,
      registeredBy: session.user.id,
      ipAddress: getClientIp(request),
    });

    if (!result.ok) {
      return fail(
        "POSSIBLE_DUPLICATE",
        "Possible duplicate patient found. Review matches or confirm to continue.",
        409,
        { duplicates: result.duplicates },
      );
    }

    return ok({ patient: result.patient }, { status: 201 });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to register patient", 500)
    );
  }
}
