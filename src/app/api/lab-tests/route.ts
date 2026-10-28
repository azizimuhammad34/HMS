import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { authErrorResponse, requirePermission } from "@/lib/auth/authorize";
import { LabServiceError, createLabTest, listLabTests } from "@/lib/services/lab";
import { labTestSchema } from "@/lib/validations/lab";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("lab:read");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const q = typeof params.q === "string" ? params.q : undefined;
    const activeOnly = params.activeOnly === "false" ? false : true;
    const tests = await listLabTests({ q, activeOnly });
    return ok({ tests });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return authErrorResponse(error) ?? fail("SERVER_ERROR", "Failed to list lab tests", 500);
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
    const parsed = labTestSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid test", 400, parsed.error.flatten());
    }
    const test = await createLabTest({ input: parsed.data, actorId: session.user.id });
    return ok({ test }, { status: 201 });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return authErrorResponse(error) ?? fail("SERVER_ERROR", "Failed to create lab test", 500);
  }
}
