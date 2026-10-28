import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  BillingServiceError,
  createInvoice,
  listInvoices,
} from "@/lib/services/billing";
import {
  createInvoiceSchema,
  invoiceListSchema,
} from "@/lib/validations/billing";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("billing:read");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = invoiceListSchema.safeParse(params);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Invalid invoice list parameters",
        400,
        parsed.error.flatten(),
      );
    }

    const result = await listInvoices(parsed.data);
    return ok(result, {
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to list invoices", 500)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("billing:create_invoice");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid invoice",
        400,
        parsed.error.flatten(),
      );
    }

    const invoice = await createInvoice({
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });
    return ok({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to create invoice", 500)
    );
  }
}
