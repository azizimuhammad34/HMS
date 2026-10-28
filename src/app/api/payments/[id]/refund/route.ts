import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  BillingServiceError,
  refundPayment,
} from "@/lib/services/billing";
import { refundPaymentSchema } from "@/lib/validations/billing";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("billing:refund");
    const { id } = await context.params;
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = refundPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid refund",
        400,
        parsed.error.flatten(),
      );
    }

    const result = await refundPayment({
      paymentId: id,
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
      fail("SERVER_ERROR", "Failed to refund payment", 500)
    );
  }
}
