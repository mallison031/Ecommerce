import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const {
      email,
      phone,
      notify_price_drop = true,
      notify_restock = true,
      target_price_kobo,
    } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id },
      include: { sector: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if user is logged in
    let customerId: string | null = null;
    const authCustomer = await getAuthenticatedCustomer(req);
    if (authCustomer) {
      customerId = authCustomer.id;
    }

    if (!customerId) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { email: cleanEmail },
      });
      if (existingCustomer) {
        customerId = existingCustomer.id;
      }
    }

    // Upsert watchlist subscription
    const watchlist = await prisma.productWatchlist.upsert({
      where: {
        product_id_email: {
          product_id: id,
          email: cleanEmail,
        },
      },
      update: {
        phone: phone || undefined,
        customer_id: customerId,
        notify_price_drop: Boolean(notify_price_drop),
        notify_restock: Boolean(notify_restock),
        target_price_kobo: target_price_kobo ? Number(target_price_kobo) : null,
        is_active: true,
      },
      create: {
        product_id: id,
        customer_id: customerId,
        email: cleanEmail,
        phone: phone || null,
        notify_price_drop: Boolean(notify_price_drop),
        notify_restock: Boolean(notify_restock),
        initial_price_kobo: product.price_kobo,
        target_price_kobo: target_price_kobo ? Number(target_price_kobo) : null,
        is_active: true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price_kobo: true,
            stock_qty: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "You have been subscribed to alerts for this product!",
        watchlist,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error subscribing to product watchlist:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update alert subscription" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const url = new URL(req.url);
    let email = url.searchParams.get("email");

    if (!email) {
      const authCustomer = await getAuthenticatedCustomer(req);
      if (authCustomer) {
        email = authCustomer.email;
      }
    }

    if (!email) {
      return NextResponse.json({ success: true, is_watching: false });
    }

    const item = await prisma.productWatchlist.findUnique({
      where: {
        product_id_email: {
          product_id: id,
          email: email.trim().toLowerCase(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      is_watching: !!(item && item.is_active),
      watchlist: item,
    });
  } catch (error: any) {
    console.error("Error checking product watchlist:", error);
    return NextResponse.json(
      { success: false, error: "Failed to query watchlist status" },
      { status: 500 }
    );
  }
}
