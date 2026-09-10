import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { formatToE164 } from "@/lib/utils";

function maskString(str: string): string {
  if (!str || str.length <= 2) return str;
  return str[0] + "***" + str[str.length - 1];
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return maskString(email);
  return `${user[0]}***@${domain}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    if (!query) {
      return NextResponse.json({ error: "Please provide an order number or phone number" }, { status: 400 });
    }

    // Clean query
    const cleanDigits = query.replace(/[^0-9]/g, "");

    let orders: any[] = [];

    // 1. Try matching Order Number if digits present and relatively short (e.g. 1 to 7 digits)
    if (/^#?\d{1,7}$/.test(query)) {
      const orderNum = parseInt(cleanDigits, 10);
      const singleOrder = await prisma.order.findUnique({
        where: { order_number: orderNum },
        include: {
          customer: true,
          items: true,
          invoice: true,
          receipt: true,
        },
      });

      if (singleOrder) {
        orders = [singleOrder];
      }
    }

    // 2. If no order found and digits match a phone number (>= 10 digits)
    if (orders.length === 0 && cleanDigits.length >= 10) {
      const e164 = formatToE164(cleanDigits);
      orders = await prisma.order.findMany({
        where: {
          OR: [
            { customer: { phone: { contains: cleanDigits } } },
            { customer: { whatsapp_phone_e164: e164 } },
          ],
        },
        include: {
          customer: true,
          items: true,
          invoice: true,
          receipt: true,
        },
        orderBy: { created_at: "desc" },
        take: 5,
      });
    }

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "No orders found matching that order number or phone number." },
        { status: 404 }
      );
    }

    // Format safe customer response
    const sanitizedOrders = orders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      total_kobo: o.total_kobo,
      currency: o.currency,
      created_at: o.created_at,
      paid_at: o.paid_at,
      customer_name: o.customer.name,
      customer_email_masked: maskEmail(o.customer.email),
      customer_phone_masked: maskString(o.customer.phone),
      whatsapp_opt_in: o.customer.whatsapp_opt_in,
      delivery_address: o.delivery_address,
      courier_name: o.courier_name || null,
      tracking_number: o.tracking_number || null,
      dispatch_notes: o.dispatch_notes || null,
      shipped_at: o.shipped_at || null,
      delivered_at: o.delivered_at || null,
      items: o.items.map((i: any) => ({
        id: i.id,
        name: i.product_name_snapshot,
        unit_price_kobo: i.unit_price_kobo_snapshot,
        quantity: i.qty,
        line_total_kobo: i.line_total_kobo,
      })),
      invoice_number: o.invoice?.invoice_number || null,
      receipt_number: o.receipt?.receipt_number || null,
    }));

    return NextResponse.json({ orders: sanitizedOrders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
