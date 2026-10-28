import { fail, ok } from "@/lib/api-response";
import { authErrorResponse, requireSession } from "@/lib/auth/authorize";
import { permissionsForRole } from "@/types/permissions";

export async function GET() {
  try {
    const session = await requireSession();
    return ok({
      user: {
        ...session.user,
        permissions: permissionsForRole(session.user.role),
      },
    });
  } catch (error) {
    return authErrorResponse(error) ?? fail("SERVER_ERROR", "Failed to load session", 500);
  }
}
