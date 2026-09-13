import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  generateSessionToken,
  CUSTOMER_SESSION_COOKIE,
  SESSION_EXPIRY_DAYS,
} from "@/lib/customer-auth";
import { hashPassword } from "@/lib/auth/password";
import { formatToE164 } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, phone, whatsapp_opt_in = true } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const customerName = name && String(name).trim() ? String(name).trim() : normalizedEmail.split("@")[0];
    const customerPhone = phone && String(phone).trim() ? String(phone).trim() : "";
    const e164Phone = customerPhone ? formatToE164(customerPhone) : null;
    const passwordHash = hashPassword(String(password));

    // Check if customer already exists
    let customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (customer && customer.password_hash) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists. Please sign in with your password.",
        },
        { status: 409 }
      );
    }

    if (customer) {
      // Customer existed from guest checkout without password; attach credentials
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customer.name || customerName,
          phone: customer.phone || customerPhone,
          whatsapp_phone_e164: customer.whatsapp_phone_e164 || e164Phone,
          password_hash: passwordHash,
          whatsapp_opt_in: customer.whatsapp_opt_in || Boolean(whatsapp_opt_in),
        },
      });
    } else {
      // Create fresh customer account
      customer = await prisma.customer.create({
        data: {
          email: normalizedEmail,
          name: customerName,
          phone: customerPhone,
          whatsapp_phone_e164: e164Phone,
          whatsapp_opt_in: Boolean(whatsapp_opt_in),
          password_hash: passwordHash,
        },
      });
    }

    // Generate session
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
      message: "Account created successfully!",
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
    console.error("Account registration error:", err);
    const message = err instanceof Error ? err.message : "Internal registration error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
