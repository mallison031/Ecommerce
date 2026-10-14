import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  destroyAdminSession,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  // Always clear the cookie, even if the session row is already gone: the client must
  // never be left holding a credential the server has already rejected.
  await destroyAdminSession();

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
