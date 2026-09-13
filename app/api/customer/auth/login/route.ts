import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  generateSessionToken,
  CUSTOMER_SESSION_COOKIE,
  SESSION_EXPIRY_DAYS,
} from "@/lib/customer-auth";
import { verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "No account found with this email address. Please create an account or use One-Time Code." },
        { status: 404 }
      );
    }

    if (!customer.password_hash) {
      return NextResponse.json(
        {
          success: false,
          error: "No password has been configured for this account yet. Please sign in using One-Time Code (OTP) or create your account password.",
          no_password_set: true,
        },
        { status: 400 }
      );
    }

    const isValid = verifyPassword(String(password), customer.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password. Please try again or use One-Time Code (OTP) to sign in." },
        { status: 401 }
      );
    }

    // Generate session token
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.customerSession.create({
      data: {
        customer_id: customer.id,
        token,
        expires_at: expiresAt,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "Sign-in successful!",
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        whatsapp_opt_in: customer.whatsapp_opt_in,
      },
    });

    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Password login error:", err);
    const message = err instanceof Error ? err.message : "Internal authentication error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
