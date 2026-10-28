import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import { PharmacyServiceError, createMedicine, listMedicines } from "@/lib/services/pharmacy";
import { medicineSchema } from "@/lib/validations/pharmacy";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("pharmacy:dispense");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const q = typeof params.q === "string" ? params.q : undefined;
    const activeOnly = params.activeOnly === "false" ? false : true;
    const medicines = await listMedicines({ q, activeOnly });
    return ok({ medicines });
  } catch (error) {
    if (error instanceof PharmacyServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to list medicines", 500)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("pharmacy:manage_stock");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }
    const parsed = medicineSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid medicine",
        400,
        parsed.error.flatten(),
      );
    }
    const medicine = await createMedicine({
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });
    return ok({ medicine }, { status: 201 });
  } catch (error) {
    if (error instanceof PharmacyServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to create medicine", 500)
    );
  }
}
