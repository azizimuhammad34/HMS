import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import {
  BillingServiceError,
  getInvoiceDetail,
} from "@/lib/services/billing";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("billing:read");
    const { id } = await context.params;
    const invoice = await getInvoiceDetail(id);
    if (!invoice) {
      return fail("NOT_FOUND", "Invoice not found", 404);
    }
    return ok({ invoice });
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to load invoice", 500)
    );
  }
}
