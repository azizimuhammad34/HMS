import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { authErrorResponse, requirePermission } from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import { LabServiceError, recordLabResult } from "@/lib/services/lab";
import { labResultSchema } from "@/lib/validations/lab";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("lab:process");
    const { id } = await context.params;
    const url = new URL(request.url);
    const labTestId = url.searchParams.get("labTestId") ?? "";
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }
    const parsed = labResultSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid result", 400, parsed.error.flatten());
    }
    await recordLabResult({ orderId: id, labTestId, input: parsed.data, actorId: session.user.id, ipAddress: getClientIp(request) });
    return ok({ success: true });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return authErrorResponse(error) ?? fail("SERVER_ERROR", "Failed to record result", 500);
  }
}
