import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import { IpdServiceError, dischargeAdmission } from "@/lib/services/ipd";
import { dischargeAdmissionSchema } from "@/lib/validations/ipd";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("ipd:discharge");
    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = dischargeAdmissionSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid discharge",
        400,
        parsed.error.flatten(),
      );
    }

    const admission = await dischargeAdmission({
      id,
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });
    return ok({ admission });
  } catch (error) {
    if (error instanceof IpdServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to discharge patient", 500)
    );
  }
}
