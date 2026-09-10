import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { email, phone } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required for restock notifications." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, stock_qty: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if customer already registered
    const existing = await prisma.stockWaitlist.findFirst({
      where: {
        product_id: id,
        email: normalizedEmail,
        notified: false,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You are already on the priority restock waitlist for this item!",
        alreadySubscribed: true,
      });
    }

    const entry = await prisma.stockWaitlist.create({
      data: {
        product_id: id,
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `You're on the list! We will notify you at ${normalizedEmail} when "${product.name}" is back in stock.`,
      waitlistId: entry.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
