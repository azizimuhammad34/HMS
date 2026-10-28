import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  IpdServiceError,
  admitPatient,
  listAdmissions,
} from "@/lib/services/ipd";
import {
  admissionListSchema,
  admitPatientSchema,
} from "@/lib/validations/ipd";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("ipd:read");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = admissionListSchema.safeParse(params);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Invalid admission list parameters",
        400,
        parsed.error.flatten(),
      );
    }

    const result = await listAdmissions(parsed.data);
    return ok(result, {
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (error) {
    if (error instanceof IpdServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to list admissions", 500)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("ipd:admit");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = admitPatientSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid admission",
        400,
        parsed.error.flatten(),
      );
    }

    const admission = await admitPatient({
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });
    return ok({ admission }, { status: 201 });
  } catch (error) {
    if (error instanceof IpdServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to admit patient", 500)
    );
  }
}
