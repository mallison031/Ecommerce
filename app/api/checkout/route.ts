import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { initializePaystackTransaction } from "@/lib/paystack";
import { formatToE164 } from "@/lib/utils";
import { z } from "zod";

const checkoutSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(8, "Valid phone number is required"),
  deliveryAddress: z.string().min(5, "Delivery address is required"),
  whatsappOptIn: z.boolean().default(false),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "At least one item is required in cart"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, phone, deliveryAddress, whatsappOptIn, items } = parsed.data;

    // Fetch product information
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        is_active: true,
      },
    });

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: "One or more products in your cart are no longer available." },
        { status: 400 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate totals & line items with price snapshots
    let subtotalKobo = 0;
    const orderItemsData = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const lineTotal = product.price_kobo * item.quantity;
      subtotalKobo += lineTotal;

      return {
        product_id: product.id,
        product_name_snapshot: product.name,
        unit_price_kobo_snapshot: product.price_kobo,
        qty: item.quantity,
        line_total_kobo: lineTotal,
      };
    });

    const totalKobo = subtotalKobo; // Any flat delivery fee can be layered on here

    // Format phone to E.164 if WhatsApp opted in
    const formattedPhone = whatsappOptIn ? formatToE164(phone) : null;

    // Upsert customer
    const customer = await prisma.customer.upsert({
      where: { email },
      update: {
        name,
        phone,
        whatsapp_opt_in: whatsappOptIn,
        whatsapp_phone_e164: formattedPhone,
      },
      create: {
        name,
        email,
        phone,
        whatsapp_opt_in: whatsappOptIn,
        whatsapp_phone_e164: formattedPhone,
      },
    });

    // Create Order with pending_payment status (no pre-reservation of stock per architecture-essentials.md)
    const order = await prisma.order.create({
      data: {
        customer_id: customer.id,
        status: "pending_payment",
        subtotal_kobo: subtotalKobo,
        total_kobo: totalKobo,
        currency: "NGN",
        delivery_address: deliveryAddress,
        items: {
          create: orderItemsData,
        },
      },
    });

    // Initialize Paystack transaction
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/order-confirmation?order=${order.id}`;
    const reference = `ord_${order.order_number}_${Date.now()}`;

    const paystackResult = await initializePaystackTransaction({
      email,
      amountKobo: totalKobo,
      reference,
      callbackUrl,
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number,
      },
    });

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackResult.data.authorization_url,
      orderNumber: order.order_number,
      orderId: order.id,
    });
  } catch (error: unknown) {
    console.error("[Checkout] Error during checkout initialization:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
