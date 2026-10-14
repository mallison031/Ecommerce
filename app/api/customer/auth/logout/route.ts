import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;

    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (token) {
      await prisma.customerSession.deleteMany({
        where: { token },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (err: unknown) {
    // Never echo raw errors: Prisma failures include the database hostname.
    console.error("Customer logout error:", err);
    return NextResponse.json(
      { error: "Sign-out is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
