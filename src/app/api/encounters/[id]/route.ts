import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { authErrorResponse, requireSession } from "@/lib/auth/authorize";
import {
  ClinicalServiceError,
  getEncounterDetail,
} from "@/lib/services/clinical";
import { roleHasPermission } from "@/types/permissions";

type RouteContext = { params: Promise<{ id: string }> };

function canAccessClinical(role: string): boolean {
  return (
    roleHasPermission(role as never, "clinical:notes") ||
    roleHasPermission(role as never, "clinical:diagnosis") ||
    roleHasPermission(role as never, "clinical:prescriptions")
  );
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession();
    if (!canAccessClinical(session.user.role)) {
      return fail("FORBIDDEN", "Insufficient permissions", 403);
    }

    const { id } = await context.params;
    const detail = await getEncounterDetail(id, {
      id: session.user.id,
      role: session.user.role,
    });
    return ok(detail);
  } catch (error) {
    if (error instanceof ClinicalServiceError) {
      return fail(error.code, error.message, error.status);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to load encounter", 500)
    );
  }
}
