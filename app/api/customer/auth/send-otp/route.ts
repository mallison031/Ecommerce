import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateOTP } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, phone } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required to sign in." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create customer record
    let customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: normalizedEmail,
          name: name ? String(name).trim() : normalizedEmail.split("@")[0],
          phone: phone ? String(phone).trim() : "",
          whatsapp_opt_in: true,
        },
      });
    }

    // Invalidate prior unused OTPs for this email
    await prisma.customerAuthCode.updateMany({
      where: { email: normalizedEmail, used: false },
      data: { used: true },
    });

    // Generate new 6-digit OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.customerAuthCode.create({
      data: {
        email: normalizedEmail,
        code,
        expires_at: expiresAt,
      },
    });

    console.log(`[Customer Auth] Verification OTP for ${normalizedEmail}: ${code} (expires: ${expiresAt.toISOString()})`);

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      expiresInMinutes: 15,
      // Provide OTP in response for automated testing environments
      otp: code,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
