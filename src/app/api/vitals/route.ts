import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
  requireSession,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  NursingServiceError,
  listVitalSigns,
  recordVitalSigns,
} from "@/lib/services/nursing";
import { vitalSignSchema } from "@/lib/validations/nursing";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("clinical:vitals");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const patientId = typeof params.patientId === "string" ? params.patientId : undefined;
    const admissionId = typeof params.admissionId === "string" ? params.admissionId : undefined;
    const encounterId = typeof params.encounterId === "string" ? params.encounterId : undefined;
    const page = params.page ? Number(params.page) : 1;
    const pageSize = params.pageSize ? Number(params.pageSize) : 50;
    const result = await listVitalSigns({ patientId, admissionId, encounterId, page, pageSize });
    return ok(result, {
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (error) {
    if (error instanceof NursingServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to list vitals", 500)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("clinical:vitals");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = vitalSignSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid vitals",
        400,
        parsed.error.flatten(),
      );
    }

    const vital = await recordVitalSigns({
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });
    return ok({ vital }, { status: 201 });
  } catch (error) {
    if (error instanceof NursingServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to record vitals", 500)
    );
  }
}
