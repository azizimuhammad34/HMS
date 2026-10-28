import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import { PharmacyServiceError, dispensePrescription, listDispenses } from "@/lib/services/pharmacy";
import { dispenseSchema } from "@/lib/validations/pharmacy";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("pharmacy:dispense");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const patientId = typeof params.patientId === "string" ? params.patientId : undefined;
    const prescriptionId = typeof params.prescriptionId === "string" ? params.prescriptionId : undefined;
    const page = params.page ? Number(params.page) : 1;
    const pageSize = params.pageSize ? Number(params.pageSize) : 50;
    const result = await listDispenses({ patientId, prescriptionId, page, pageSize });
    return ok(result, {
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (error) {
    if (error instanceof PharmacyServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to list dispenses", 500)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("pharmacy:dispense");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }
    const parsed = dispenseSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid dispense",
        400,
        parsed.error.flatten(),
      );
    }
    const dispense = await dispensePrescription({
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });
    return ok({ dispense }, { status: 201 });
  } catch (error) {
    if (error instanceof PharmacyServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to dispense", 500)
    );
  }
}
