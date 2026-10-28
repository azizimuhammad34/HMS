import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  BillingServiceError,
  voidInvoice,
} from "@/lib/services/billing";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("billing:void");
    const { id } = await context.params;
    const invoice = await voidInvoice({
      id,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });
    return ok({ invoice });
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to void invoice", 500)
    );
  }
}
