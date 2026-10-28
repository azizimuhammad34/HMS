import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  ClinicalServiceError,
  completeEncounter,
} from "@/lib/services/clinical";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("clinical:notes");
    const { id } = await context.params;
    const encounter = await completeEncounter({
      id,
      actor: { id: session.user.id, role: session.user.role },
      ipAddress: getClientIp(request),
    });
    return ok({ encounter });
  } catch (error) {
    if (error instanceof ClinicalServiceError) {
      return fail(error.code, error.message, error.status);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to complete encounter", 500)
    );
  }
}
