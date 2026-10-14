import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "aura_admin_session";
const LOGIN_PATH = "/admin/login";

// Cheap first-line gate. Middleware runs on the Edge runtime, so it cannot reach Prisma and
// cannot tell a live session from a stale or made-up cookie value. Presence here just keeps
// anonymous traffic off the admin pages; `app/admin/(panel)/layout.tsx` and the admin API
// routes do the real verification against the AdminSession table.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === LOGIN_PATH || pathname.startsWith("/api/admin/auth/")) {
    return NextResponse.next();
  }

  if (req.cookies.get(ADMIN_SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
