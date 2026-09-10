import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  generateSessionToken,
  CUSTOMER_SESSION_COOKIE,
  SESSION_EXPIRY_DAYS,
} from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedCode = String(code).trim();

    // Verify code
    const authCode = await prisma.customerAuthCode.findFirst({
      where: {
        email: normalizedEmail,
        code: normalizedCode,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    if (!authCode) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark code as used
    await prisma.customerAuthCode.update({
      where: { id: authCode.id },
      data: { used: true },
    });

    // Ensure customer exists
    let customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: normalizedEmail,
          name: normalizedEmail.split("@")[0],
          phone: "",
          whatsapp_opt_in: true,
        },
      });
    }

    // Generate Session Token
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

    // Set secure HTTP-only cookie
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
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
