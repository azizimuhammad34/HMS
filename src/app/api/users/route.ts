import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import {
  authErrorResponse,
  canAssignRole,
  requirePermission,
} from "@/lib/auth/authorize";
import { hashPassword } from "@/lib/auth/password";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { getClientIp } from "@/lib/http";
import { writeAudit } from "@/lib/services/audit";
import { createUserSchema } from "@/lib/validations/auth";

export async function GET() {
  try {
    await requirePermission("users:manage");
    await connectDb();
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("email fullName role isActive mustChangePassword lastLoginAt createdAt")
      .lean();

    return ok({
      users: users.map((u) => ({
        id: String(u._id),
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    return authErrorResponse(error) ?? fail("SERVER_ERROR", "Failed to list users", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("users:manage");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_JSON", "Request body must be JSON");
    }

    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Invalid user data", 400, parsed.error.flatten());
    }

    if (!canAssignRole(session.user, parsed.data.role)) {
      return fail(
        "FORBIDDEN",
        "You are not allowed to assign this role",
        403,
      );
    }

    if (
      parsed.data.role === "SUPER_ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return fail(
        "FORBIDDEN",
        "Only Super Admin can create Super Admin accounts",
        403,
      );
    }

    await connectDb();
    const passwordHash = await hashPassword(parsed.data.temporaryPassword);
    const user = await User.create({
      email: parsed.data.email.toLowerCase(),
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      passwordHash,
      isActive: true,
      mustChangePassword: true,
      createdBy: session.user.id,
    });

    await writeAudit({
      actorId: session.user.id,
      action: "users.created",
      resourceType: "User",
      resourceId: String(user._id),
      ipAddress: getClientIp(request),
      metadata: {
        email: user.email,
        role: user.role,
        // Temporary password is never logged
      },
    });

    return ok(
      {
        id: String(user._id),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mustChangePassword: true,
      },
      { status: 201 },
    );
  } catch (error) {
    const duplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000;

    if (duplicate) {
      return fail("CONFLICT", "A user with this email already exists", 409);
    }

    return authErrorResponse(error) ?? fail("SERVER_ERROR", "Failed to create user", 500);
  }
}
