import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import {
  clearSessionCookie,
  revokeSessionByToken,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { getClientIp } from "@/lib/http";
import { writeAudit } from "@/lib/services/audit";
import { getSessionFromCookies } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    await revokeSessionByToken(token);
  }
  await clearSessionCookie();

  if (session) {
    await writeAudit({
      actorId: session.user.id,
      action: "auth.logout",
      resourceType: "User",
      resourceId: session.user.id,
      ipAddress: getClientIp(request),
    });
  }

  return ok({ loggedOut: true });
}
