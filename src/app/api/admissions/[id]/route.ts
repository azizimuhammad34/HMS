import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { IpdServiceError, getAdmissionById } from "@/lib/services/ipd";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("ipd:read");
    const { id } = await context.params;
    const admission = await getAdmissionById(id);
    if (!admission) {
      return fail("NOT_FOUND", "Admission not found", 404);
    }
    return ok({ admission });
  } catch (error) {
    if (error instanceof IpdServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to load admission", 500)
    );
  }
}
