import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateDocumentPdf } from "@/lib/pdf/invoice";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Search by order id or invoice number or order number
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { invoice: { id } },
          { invoice: { invoice_number: !isNaN(Number(id)) ? Number(id) : -1 } },
          { order_number: !isNaN(Number(id)) ? Number(id) : -1 },
        ],
      },
      include: {
        customer: true,
        items: true,
        invoice: true,
        receipt: true,
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Invoice or order not found" }, { status: 404 });
    }

    if (order.status !== "paid" && order.status !== "shipped" && order.status !== "delivered") {
      return NextResponse.json(
        { error: "Invoice is only available for confirmed and paid orders." },
        { status: 400 }
      );
    }

    const invoiceNumber = order.invoice?.invoice_number || order.order_number;

    const pdfBytes = await generateDocumentPdf({
      type: "INVOICE",
      documentNumber: invoiceNumber,
      orderNumber: order.order_number,
      date: order.paid_at || order.created_at,
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      customerPhone: order.customer.phone,
      deliveryAddress: order.delivery_address,
      courierName: order.courier_name,
      trackingNumber: order.tracking_number,
      dispatchNotes: order.dispatch_notes,
      items: order.items.map((i) => ({
        name: i.product_name_snapshot,
        quantity: i.qty,
        unitPriceKobo: i.unit_price_kobo_snapshot,
        lineTotalKobo: i.line_total_kobo,
      })),
      totalKobo: order.total_kobo,
      paystackReference: order.payment?.paystack_reference,
    });

    const buffer = Buffer.from(pdfBytes);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${order.order_number}.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
