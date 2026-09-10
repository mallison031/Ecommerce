import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyWebhookSignature, verifyPaystackTransaction } from "@/lib/paystack";
import { notifyOrderStatusChange } from "@/lib/notify";
import { generateDocumentPdf } from "@/lib/pdf/invoice";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // 1. Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Paystack Webhook] Invalid signature rejected.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // We only process charge.success events
    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true, ignored: true });
    }

    const { reference, amount } = event.data;

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    // 2. Double-check verification via Paystack's Verify API (Defense-in-depth)
    const verification = await verifyPaystackTransaction(reference);
    if (!verification.status || verification.data.status !== "success") {
      console.warn(`[Paystack Webhook] Verify API call did not return success for ref: ${reference}`);
      return NextResponse.json({ error: "Transaction verification failed" }, { status: 400 });
    }

    // 3. Idempotency Check: Has this paystack_reference already been processed?
    const existingPayment = await prisma.payment.findUnique({
      where: { paystack_reference: reference },
    });

    if (existingPayment) {
      // Already processed. Return 200 immediately to acknowledge Paystack.
      return NextResponse.json({ message: "Event already processed", reference });
    }

    // Identify target order (from metadata or reference prefix)
    const orderId = event.data.metadata?.orderId as string | undefined;
    let targetOrder = orderId
      ? await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true, customer: true },
        })
      : null;

    if (!targetOrder) {
      console.error(`[Paystack Webhook] Order not found for reference ${reference}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Rule 8: If order is 'abandoned' or 'pending_payment', transition it normally to 'paid'
    if (targetOrder.status === "paid") {
      return NextResponse.json({ message: "Order is already paid", orderNumber: targetOrder.order_number });
    }

    // 4. ATOMIC DATABASE TRANSACTION (Rule 3):
    // - Update Order status to 'paid'
    // - Decrement stock per line item
    // - Create Payment row
    // - Create sequential Invoice & Receipt rows (Rule 4)
    // - Record SalesLedgerEntry
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Record payment
      await tx.payment.create({
        data: {
          order_id: targetOrder.id,
          paystack_reference: reference,
          status: "success",
          amount_kobo: amount,
          raw_payload_json: event,
        },
      });

      // Update Order status
      const orderRecord = await tx.order.update({
        where: { id: targetOrder.id },
        data: {
          status: "paid",
          paid_at: new Date(),
        },
        include: {
          items: true,
          customer: true,
        },
      });

      // Decrement stock per item
      for (const item of targetOrder.items) {
        if (item.product_id) {
          await tx.product.update({
            where: { id: item.product_id },
            data: {
              stock_qty: {
                decrement: item.qty,
              },
            },
          });
        }
      }

      // Create sequential Invoice and Receipt
      const invoice = await tx.invoice.create({
        data: {
          order_id: targetOrder.id,
        },
      });

      const receipt = await tx.receipt.create({
        data: {
          order_id: targetOrder.id,
        },
      });

      // Compute sector breakdown for SalesLedgerEntry
      const sectorBreakdown: Record<string, number> = {};
      for (const item of targetOrder.items) {
        sectorBreakdown[item.product_name_snapshot] =
          (sectorBreakdown[item.product_name_snapshot] || 0) + item.line_total_kobo;
      }

      await tx.salesLedgerEntry.create({
        data: {
          order_id: targetOrder.id,
          amount_kobo: amount,
          sector_breakdown_json: sectorBreakdown,
        },
      });

      return { orderRecord, invoice, receipt };
    });

    // 5. Generate Invoice & Receipt PDFs
    try {
      await generateDocumentPdf({
        type: "INVOICE",
        documentNumber: updatedOrder.invoice.invoice_number,
        orderNumber: updatedOrder.orderRecord.order_number,
        date: new Date(),
        customerName: targetOrder.customer.name,
        customerEmail: targetOrder.customer.email,
        customerPhone: targetOrder.customer.phone,
        deliveryAddress: targetOrder.delivery_address,
        items: targetOrder.items.map((i) => ({
          name: i.product_name_snapshot,
          quantity: i.qty,
          unitPriceKobo: i.unit_price_kobo_snapshot,
          lineTotalKobo: i.line_total_kobo,
        })),
        totalKobo: targetOrder.total_kobo,
        paystackReference: reference,
      });

      await generateDocumentPdf({
        type: "RECEIPT",
        documentNumber: updatedOrder.receipt.receipt_number,
        orderNumber: updatedOrder.orderRecord.order_number,
        date: new Date(),
        customerName: targetOrder.customer.name,
        customerEmail: targetOrder.customer.email,
        customerPhone: targetOrder.customer.phone,
        deliveryAddress: targetOrder.delivery_address,
        items: targetOrder.items.map((i) => ({
          name: i.product_name_snapshot,
          quantity: i.qty,
          unitPriceKobo: i.unit_price_kobo_snapshot,
          lineTotalKobo: i.line_total_kobo,
        })),
        totalKobo: targetOrder.total_kobo,
        paystackReference: reference,
      });
    } catch (pdfErr) {
      console.error("[Paystack Webhook] Failed generating PDFs:", pdfErr);
    }

    // 6. Notify Customer and Admin via Shared Notification Pipeline (Rule 6 & 7)
    await notifyOrderStatusChange({
      orderId: targetOrder.id,
      status: "paid",
    });

    return NextResponse.json({ success: true, orderNumber: updatedOrder.orderRecord.order_number });
  } catch (error: unknown) {
    console.error("[Paystack Webhook] Processing error:", error);
    const message = error instanceof Error ? error.message : "Webhook handler error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
