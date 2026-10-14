import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

export const ADMIN_SESSION_COOKIE = "aura_admin_session";
export const ADMIN_SESSION_HOURS = 12;

// The cookie carries the random token; the database stores only its sha256 digest, so a
// leaked table cannot be replayed as a live session.
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: { admin_id: adminId, token_hash: hashToken(token), expires_at },
  });

  return { token, expires_at };
}

export async function getAuthenticatedAdmin() {
  try {
    const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = await prisma.adminSession.findUnique({
      where: { token_hash: hashToken(token) },
      include: { admin: true },
    });

    if (!session) return null;

    if (new Date() > session.expires_at) {
      await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.admin;
  } catch (err) {
    // Fail closed: an unreachable database must never read as an authorised admin.
    console.error("[Admin auth] session lookup failed:", err);
    return null;
  }
}

/**
 * Returns a 401 response when the caller is not an authenticated admin, or null when the
 * handler may proceed. Reads the session cookie itself, so route handlers do not need a
 * request parameter — 9 of the existing admin handlers had none.
 */
export async function requireAdmin() {
  const admin = await getAuthenticatedAdmin();
  if (admin) return null;
  return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
}

export async function destroyAdminSession() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return;
  await prisma.adminSession
    .deleteMany({ where: { token_hash: hashToken(token) } })
    .catch((err) => console.error("[Admin auth] session teardown failed:", err));
}

export function adminSessionCookieOptions(expires_at: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expires_at,
  };
}
