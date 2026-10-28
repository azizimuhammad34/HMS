import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  BillingServiceError,
  recordPayment,
} from "@/lib/services/billing";
import { recordPaymentSchema } from "@/lib/validations/billing";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("billing:record_payment");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid payment",
        400,
        parsed.error.flatten(),
      );
    }

    const result = await recordPayment({
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });
    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to record payment", 500)
    );
  }
}
