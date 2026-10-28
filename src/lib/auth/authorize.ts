import { fail } from "@/lib/api-response";
import {
  getSessionFromCookies,
  type AuthUser,
  type SessionContext,
} from "@/lib/auth/session";
import {
  roleHasPermission,
  type Permission,
} from "@/types/permissions";
import type { Role } from "@/types/roles";
import { NextResponse } from "next/server";

export class AuthError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 401, code = "UNAUTHORIZED") {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new AuthError("Authentication required", 401, "UNAUTHORIZED");
  }
  return session;
}

export async function requirePermission(
  permission: Permission,
): Promise<SessionContext> {
  const session = await requireSession();
  if (!roleHasPermission(session.user.role, permission)) {
    throw new AuthError("Insufficient permissions", 403, "FORBIDDEN");
  }
  return session;
}

export async function requireRoles(
  roles: Role[],
): Promise<SessionContext> {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new AuthError("Insufficient permissions", 403, "FORBIDDEN");
  }
  return session;
}

export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return fail(error.code, error.message, error.status);
  }
  return null;
}

export function canAssignRole(actor: AuthUser, targetRole: Role): boolean {
  if (actor.role === "SUPER_ADMIN") {
    return true;
  }
  if (actor.role === "ADMIN") {
    return (
      targetRole === "RECEPTIONIST" ||
      targetRole === "DOCTOR" ||
      targetRole === "NURSE"
    );
  }
  return false;
}
