import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { authErrorResponse, requireSession } from "@/lib/auth/authorize";
import {
  ClinicalServiceError,
  listEncounters,
} from "@/lib/services/clinical";
import { roleHasPermission } from "@/types/permissions";
import { encounterListSchema } from "@/lib/validations/clinical";

function canAccessClinical(role: string): boolean {
  return (
    roleHasPermission(role as never, "clinical:notes") ||
    roleHasPermission(role as never, "clinical:diagnosis") ||
    roleHasPermission(role as never, "clinical:prescriptions")
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!canAccessClinical(session.user.role)) {
      return fail("FORBIDDEN", "Insufficient permissions", 403);
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = encounterListSchema.safeParse(params);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Invalid list parameters",
        400,
        parsed.error.flatten(),
      );
    }

    const scopedDoctorId =
      session.user.role === "DOCTOR" ? session.user.id : undefined;

    const result = await listEncounters({
      ...parsed.data,
      scopedDoctorId,
    });

    return ok(result, {
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        date: result.date,
      },
    });
  } catch (error) {
    if (error instanceof ClinicalServiceError) {
      return fail(error.code, error.message, error.status);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to list encounters", 500)
    );
  }
}
