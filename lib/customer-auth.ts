import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export const CUSTOMER_SESSION_COOKIE = "aura_customer_session";
export const SESSION_EXPIRY_DAYS = 30;

export async function getAuthenticatedCustomer(req: NextRequest) {
  try {
    // 1. Check cookie
    let token = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;

    // 2. Check Authorization header fallback (e.g. Bearer <token>)
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) return null;

    const session = await prisma.customerSession.findUnique({
      where: { token },
      include: {
        customer: true,
      },
    });

    if (!session) return null;

    // Check expiration
    if (new Date() > session.expires_at) {
      // Clean expired session
      await prisma.customerSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.customer;
  } catch (err) {
    console.error("Auth check error:", err);
    return null;
  }
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
