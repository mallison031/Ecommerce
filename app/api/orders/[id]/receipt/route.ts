import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateDocumentPdf } from "@/lib/pdf/invoice";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        receipt: true,
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "paid" && order.status !== "shipped" && order.status !== "delivered") {
      return NextResponse.json(
        { error: "Receipt is only available for confirmed and paid orders." },
        { status: 400 }
      );
    }

    const docTypeParam = req.nextUrl.searchParams.get("type");
    const isPackingSlip = docTypeParam === "packing_slip";

    const receiptNumber = order.receipt?.receipt_number || order.order_number;

    const pdfBytes = await generateDocumentPdf({
      type: isPackingSlip ? "PACKING_SLIP" : "RECEIPT",
      documentNumber: receiptNumber,
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
    const filename = isPackingSlip
      ? `packing-slip-${order.order_number}.pdf`
      : `receipt-${order.order_number}.pdf`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
