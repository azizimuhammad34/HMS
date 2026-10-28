import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { getClientIp, getUserAgent } from "@/lib/http";
import { writeAudit } from "@/lib/services/audit";
import { loginSchema } from "@/lib/validations/auth";
import { permissionsForRole } from "@/types/permissions";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? "unknown";
  const limit = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return fail(
      "RATE_LIMITED",
      "Too many login attempts. Try again later.",
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_JSON", "Request body must be JSON");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid login data", 400, parsed.error.flatten());
  }

  try {
    await connectDb();
    const user = await User.findOne({
      email: parsed.data.email.toLowerCase(),
    }).select("+passwordHash");

    const invalid = fail("INVALID_CREDENTIALS", "Invalid email or password", 401);

    if (!user || !user.passwordHash) {
      await writeAudit({
        action: "auth.login_failed",
        resourceType: "User",
        ipAddress: ip,
        success: false,
        metadata: { email: parsed.data.email.toLowerCase() },
      });
      return invalid;
    }

    const matches = await verifyPassword(parsed.data.password, user.passwordHash);
    const userId = String(user._id);

    if (!matches) {
      await writeAudit({
        actorId: userId,
        action: "auth.login_failed",
        resourceType: "User",
        resourceId: userId,
        ipAddress: ip,
        success: false,
      });
      return invalid;
    }

    if (!user.isActive) {
      await writeAudit({
        actorId: userId,
        action: "auth.login_blocked_inactive",
        resourceType: "User",
        resourceId: userId,
        ipAddress: ip,
        success: false,
      });
      return fail("ACCOUNT_INACTIVE", "This account is inactive", 403);
    }

    const { token, expiresAt } = await createSession({
      userId,
      ipAddress: ip,
      userAgent: getUserAgent(request),
    });
    await setSessionCookie(token, expiresAt);

    user.lastLoginAt = new Date();
    await user.save();

    await writeAudit({
      actorId: userId,
      action: "auth.login_success",
      resourceType: "User",
      resourceId: userId,
      ipAddress: ip,
    });

    return ok({
      user: {
        id: String(user._id),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mustChangePassword: Boolean(user.mustChangePassword),
        permissions: permissionsForRole(user.role),
      },
    });
  } catch {
    return fail("SERVER_ERROR", "Login failed", 500);
  }
}
