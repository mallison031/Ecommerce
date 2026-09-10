import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import { formatToE164 } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);

    if (!customer) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view your account." },
        { status: 401 }
      );
    }

    // Fetch complete customer profile data in parallel
    const [orders, addresses, waitlists] = await Promise.all([
      prisma.order.findMany({
        where: { customer_id: customer.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  image_urls: true,
                  price_kobo: true,
                  stock_qty: true,
                  sector: { select: { slug: true, name: true } },
                },
              },
            },
          },
          invoice: { select: { invoice_number: true } },
          receipt: { select: { receipt_number: true } },
          payment: { select: { status: true, paystack_reference: true, verified_at: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.customerAddress.findMany({
        where: { customer_id: customer.id },
        orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
      }),
      prisma.stockWaitlist.findMany({
        where: { email: customer.email },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price_kobo: true,
              stock_qty: true,
              image_urls: true,
              sector: { select: { slug: true, name: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
      }),
    ]);

    // Calculate summary statistics
    const totalSpentKobo = orders
      .filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "delivered")
      .reduce((acc, curr) => acc + curr.total_kobo, 0);

    const deliveredOrdersCount = orders.filter((o) => o.status === "delivered").length;
    const activeOrdersCount = orders.filter((o) => o.status === "paid" || o.status === "shipped").length;

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        whatsapp_opt_in: customer.whatsapp_opt_in,
        whatsapp_phone_e164: customer.whatsapp_phone_e164,
        created_at: customer.created_at,
      },
      orders,
      addresses,
      waitlists,
      stats: {
        totalOrders: orders.length,
        activeOrdersCount,
        deliveredOrdersCount,
        totalSpentKobo,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);

    if (!customer) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to update your profile." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, phone, whatsapp_opt_in } = body;

    const dataToUpdate: Record<string, any> = {};

    if (typeof name === "string" && name.trim()) {
      dataToUpdate.name = name.trim();
    }

    if (typeof phone === "string") {
      dataToUpdate.phone = phone.trim();
      if (phone.trim()) {
        const e164 = formatToE164(phone.trim());
        if (e164) dataToUpdate.whatsapp_phone_e164 = e164;
      }
    }

    if (typeof whatsapp_opt_in === "boolean") {
      dataToUpdate.whatsapp_opt_in = whatsapp_opt_in;
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      customer: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        whatsapp_opt_in: updated.whatsapp_opt_in,
        whatsapp_phone_e164: updated.whatsapp_phone_e164,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
