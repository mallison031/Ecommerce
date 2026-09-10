import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { initializePaystackTransaction } from "@/lib/paystack";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId") || searchParams.get("order");

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const alreadyPaid = order.status === "paid" || order.status === "shipped" || order.status === "delivered";

    return NextResponse.json({
      success: true,
      alreadyPaid,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_kobo: order.total_kobo,
        currency: order.currency,
        delivery_address: order.delivery_address,
        created_at: order.created_at,
        reminder_sent_at: order.reminder_sent_at,
        customer: {
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
          whatsapp_opt_in: order.customer.whatsapp_opt_in,
        },
        items: order.items.map((i) => ({
          id: i.id,
          product_name_snapshot: i.product_name_snapshot,
          unit_price_kobo_snapshot: i.unit_price_kobo_snapshot,
          qty: i.qty,
          line_total_kobo: i.line_total_kobo,
        })),
      },
    });
  } catch (error: unknown) {
    console.error("[Checkout Resume] Error retrieving order:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, discountCode } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "paid" || order.status === "shipped" || order.status === "delivered") {
      return NextResponse.json({ error: "Order is already paid" }, { status: 400 });
    }

    // Check optional recovery discount code (e.g., SAVE5 or RECOVER5 gives 5% discount)
    let finalAmountKobo = order.total_kobo;
    let discountAppliedKobo = 0;

    const normalizedCode = discountCode ? String(discountCode).trim().toUpperCase() : "";
    if (normalizedCode === "SAVE5" || normalizedCode === "RECOVER5") {
      discountAppliedKobo = Math.round(order.total_kobo * 0.05);
      finalAmountKobo = Math.max(10000, order.total_kobo - discountAppliedKobo); // minimum ₦100
    }

    // Initialize Paystack transaction for resumption
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/order-confirmation?order=${order.id}`;
    const reference = `ord_resume_${order.order_number}_${Date.now()}`;

    const paystackResult = await initializePaystackTransaction({
      email: order.customer.email,
      amountKobo: finalAmountKobo,
      reference,
      callbackUrl,
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number,
        isResumed: true,
        discountAppliedKobo,
      },
    });

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackResult.data.authorization_url,
      orderNumber: order.order_number,
      finalAmountKobo,
      discountAppliedKobo,
    });
  } catch (error: unknown) {
    console.error("[Checkout Resume] Error initializing resumption payment:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
