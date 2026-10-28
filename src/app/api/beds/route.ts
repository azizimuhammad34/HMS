import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  requirePermission,
} from "@/lib/auth/authorize";
import { getClientIp } from "@/lib/http";
import {
  IpdServiceError,
  createBed,
  listBeds,
} from "@/lib/services/ipd";
import { bedListSchema, createBedSchema } from "@/lib/validations/ipd";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("ipd:read");
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = bedListSchema.safeParse(params);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Invalid bed list parameters",
        400,
        parsed.error.flatten(),
      );
    }
    const beds = await listBeds(parsed.data);
    return ok({ beds });
  } catch (error) {
    if (error instanceof IpdServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to list beds", 500)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("ipd:manage_beds");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = createBedSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid bed",
        400,
        parsed.error.flatten(),
      );
    }

    const bed = await createBed({
      input: parsed.data,
      actorId: session.user.id,
      ipAddress: getClientIp(request),
    });
    return ok({ bed }, { status: 201 });
  } catch (error) {
    if (error instanceof IpdServiceError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return (
      authErrorResponse(error) ??
      fail("SERVER_ERROR", "Failed to create bed", 500)
    );
  }
}
