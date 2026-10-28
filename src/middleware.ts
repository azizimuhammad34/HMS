import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

const PUBLIC_PATHS = ["/login", "/setup"];
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/setup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isPublicPage = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (pathname.startsWith("/api/")) {
    if (isPublicApi || pathname === "/api/auth/logout") {
      return NextResponse.next();
    }
    if (!hasSession) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (!hasSession && !isPublicPage && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && (pathname === "/login" || pathname === "/setup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
