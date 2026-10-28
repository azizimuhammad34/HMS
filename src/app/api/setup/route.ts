import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { HospitalSettings } from "@/lib/db/models/HospitalSettings";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/http";
import { writeAudit } from "@/lib/services/audit";
import { setupSuperAdminSchema } from "@/lib/validations/auth";

export async function GET() {
  try {
    await connectDb();
    const existing = await User.exists({ role: "SUPER_ADMIN" });
    return ok({ setupRequired: !existing });
  } catch {
    return fail("SERVER_ERROR", "Unable to check setup status", 500);
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? "unknown";
  const limit = checkRateLimit(`setup:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return fail(
      "RATE_LIMITED",
      "Too many setup attempts. Try again later.",
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_JSON", "Request body must be JSON");
  }

  const parsed = setupSuperAdminSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Invalid setup data", 400, parsed.error.flatten());
  }

  try {
    const env = getEnv();
    if (parsed.data.setupSecret !== env.SETUP_SECRET) {
      await writeAudit({
        action: "setup.super_admin_failed",
        resourceType: "User",
        ipAddress: ip,
        success: false,
        metadata: { reason: "invalid_setup_secret" },
      });
      return fail("FORBIDDEN", "Invalid setup secret", 403);
    }

    await connectDb();
    const existing = await User.exists({ role: "SUPER_ADMIN" });
    if (existing) {
      return fail(
        "SETUP_COMPLETE",
        "Super Admin already exists. Setup is disabled.",
        409,
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await User.create({
      email: parsed.data.email.toLowerCase(),
      fullName: parsed.data.fullName,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      mustChangePassword: false,
    });

    await HospitalSettings.findOneAndUpdate(
      { key: "default" },
      {
        $setOnInsert: {
          key: "default",
          hospitalName: " Hospital Management System",
          city: "Gilgit",
          region: "Gilgit-Baltistan",
          country: "Pakistan",
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    await writeAudit({
      actorId: String(user._id),
      action: "setup.super_admin_created",
      resourceType: "User",
      resourceId: String(user._id),
      ipAddress: ip,
      metadata: { email: user.email },
    });

    return ok(
      {
        id: String(user._id),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
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

    return fail("SERVER_ERROR", "Setup failed", 500);
  }
}
