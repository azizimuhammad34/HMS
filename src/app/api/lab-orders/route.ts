import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { authErrorResponse, requirePermission } from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import { LabServiceError, createLabOrder, listLabOrders } from "@/lib/services/lab";
import { labOrderSchema } from "@/lib/validations/lab";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("lab:read");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const patientId = typeof params.patientId === "string" ? params.patientId : undefined;
    const status = typeof params.status === "string" ? params.status : undefined;
    const page = params.page ? Number(params.page) : 1;
    const pageSize = params.pageSize ? Number(params.pageSize) : 50;
    const result = await listLabOrders({ patientId, status, page, pageSize });
    return ok(result, { meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return authErrorResponse(error) ?? fail("SERVER_ERROR", "Failed to list lab orders", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("lab:order");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }
    const parsed = labOrderSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid order", 400, parsed.error.flatten());
    }
    const order = await createLabOrder({ input: parsed.data, actorId: session.user.id, ipAddress: getClientIp(request) });
    return ok({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return authErrorResponse(error) ?? fail("SERVER_ERROR", "Failed to create lab order", 500);
  }
}
