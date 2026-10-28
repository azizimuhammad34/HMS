import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { connectDb } from "@/lib/db/connection";
import { Session } from "@/lib/db/models/Session";
import { User, type UserDocument } from "@/lib/db/models/User";
import { getEnv, isProduction } from "@/lib/env";
import { generateToken, hashToken } from "@/lib/utils/crypto";
import type { Role } from "@/types/roles";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
};

export type SessionContext = {
  user: AuthUser;
  sessionId: string;
};

function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: String(user._id),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

export async function createSession(params: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  await connectDb();
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await Session.create({
    tokenHash: hashToken(token),
    userId: params.userId,
    expiresAt,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  });

  return { token, expiresAt };
}

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await connectDb();
  await Session.updateOne(
    { tokenHash: hashToken(token), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await connectDb();
  await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function getSessionFromCookies(): Promise<SessionContext | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionFromToken(token);
}

export async function getSessionFromToken(
  token: string,
): Promise<SessionContext | null> {
  await connectDb();
  const session = await Session.findOne({
    tokenHash: hashToken(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) return null;

  const user = await User.findById(session.userId);
  if (!user || !user.isActive) return null;

  return {
    user: toAuthUser(user),
    sessionId: String(session._id),
  };
}

/** Ensures SESSION_SECRET is configured (cookie signing / app secret). */
export function assertSessionSecretConfigured(): void {
  getEnv();
}
