import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateOTP } from "@/lib/customer-auth";
import { sendSignInOtpEmail } from "@/lib/notify";

const RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_EXPIRY_MINUTES = 15;

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

    // This endpoint sends real email, so it needs the same throttle an email provider would
    // apply for us: one code per address per minute.
    const lastSentAt = await prisma.customerAuthCode.findFirst({
      where: { email: normalizedEmail },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    });

    if (lastSentAt && Date.now() - lastSentAt.created_at.getTime() < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - lastSentAt.created_at.getTime())) / 1000
      );
      return NextResponse.json(
        {
          error: `Please wait ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"} before requesting another code.`,
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Deliver first, persist second: a code that never reached an inbox should not sit in the
    // table looking valid to whoever guesses it.
    try {
      await sendSignInOtpEmail({
        toEmail: normalizedEmail,
        code,
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      });
    } catch (err) {
      console.error("[Customer Auth] OTP email delivery failed:", err);
      return NextResponse.json(
        { error: "We could not send the verification email. Please try again shortly." },
        { status: 503 }
      );
    }

    // Invalidate prior unused OTPs for this email
    await prisma.customerAuthCode.updateMany({
      where: { email: normalizedEmail, used: false },
      data: { used: true },
    });

    await prisma.customerAuthCode.create({
      data: {
        email: normalizedEmail,
        code,
        expires_at: expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (err: unknown) {
    // Raw errors can carry connection details, so they stay in the server log only.
    console.error("[Customer Auth] send-otp failed:", err);
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }
}
