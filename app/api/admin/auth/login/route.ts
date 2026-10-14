import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSession,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Verify against a real, format-valid hash when the address is unknown, so a wrong
// email costs the same scrypt work as a wrong password and cannot be told apart by timing.
const UNKNOWN_EMAIL_DUMMY_HASH =
  "be85e8d44fcede91e5c27f8bcc0df85a:4dfaa50cf67101bdb9aa2bf5bebff3696ded61d4b1aa2aa7687b8ece6a096f8904a48724f45169712b61efc39c2390679e15414515a03a93e2001f40b5c29300";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    const passwordOk = verifyPassword(
      password,
      admin?.password_hash || UNKNOWN_EMAIL_DUMMY_HASH
    );

    if (!admin || !passwordOk) {
      return NextResponse.json(
        { success: false, error: "Those credentials are not recognised." },
        { status: 401 }
      );
    }

    const { token, expires_at } = await createAdminSession(admin.id);

    const res = NextResponse.json({
      success: true,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    });
    res.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions(expires_at));
    return res;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "Sign-in is temporarily unavailable." },
      { status: 503 }
    );
  }
}
