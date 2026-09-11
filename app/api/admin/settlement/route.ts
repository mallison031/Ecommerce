import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Calculates Paystack gateway fee in Kobo for Nigerian local transactions.
 * Formula: 1.5% + NGN 100 (flat fee waived if transaction < NGN 2,500), capped at NGN 2,000.
 */
function calculatePaystackFeeKobo(amountKobo: number): number {
  if (amountKobo <= 0) return 0;
  let fee = Math.round(amountKobo * 0.015);
  // Add 10,000 kobo (NGN 100) if order is NGN 2,500 or higher
  if (amountKobo >= 250000) {
    fee += 10000;
  }
  // Max cap 200,000 kobo (NGN 2,000)
  return Math.min(fee, 200000);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const format = searchParams.get("format") || "json";

    // Default to today
    let startDate: Date;
    let endDate: Date;

    if (dateParam && dateParam !== "today") {
      startDate = new Date(dateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const dateStr = startDate.toISOString().split("T")[0];

    // Query paid orders within the window
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ["paid", "shipped", "delivered", "returned"],
        },
      },
      include: {
        customer: true,
        payment: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Query completed refunds within the window
    const refunds = await prisma.returnRequest.findMany({
      where: {
        status: "refunded",
        refunded_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        order: true,
        customer: true,
      },
      orderBy: { created_at: "desc" },
    });

    let grossVolumeKobo = 0;
    let itemsSubtotalKobo = 0;
    let deliveryFeesKobo = 0;
    let totalGatewayFeesKobo = 0;

    const transactionRows = orders.map((o) => {
      const gross = o.total_kobo;
      const subtotal = o.subtotal_kobo;
      const delivery = Math.max(0, o.total_kobo - o.subtotal_kobo);
      const fee = calculatePaystackFeeKobo(gross);
      const net = gross - fee;

      grossVolumeKobo += gross;
      itemsSubtotalKobo += subtotal;
      deliveryFeesKobo += delivery;
      totalGatewayFeesKobo += fee;

      return {
        id: o.id,
        orderNumber: o.order_number,
        reference: o.payment?.paystack_reference || `ORD-${o.order_number}`,
        createdAt: o.created_at.toISOString(),
        customerName: o.customer.name,
        customerEmail: o.customer.email,
        subtotalKobo: subtotal,
        deliveryKobo: delivery,
        grossTotalKobo: gross,
        paystackFeeKobo: fee,
        netPayoutKobo: net,
        status: o.status,
      };
    });

    let totalRefundsKobo = 0;
    const refundRows = refunds.map((r) => {
      totalRefundsKobo += r.refund_amount_kobo;
      return {
        id: r.id,
        orderId: r.order_id,
        orderNumber: r.order.order_number,
        customerName: r.customer.name,
        refundAmountKobo: r.refund_amount_kobo,
        refundMethod: r.refund_method,
        processedAt: r.refunded_at?.toISOString() || r.updated_at.toISOString(),
      };
    });

    const netSettlementPayoutKobo = grossVolumeKobo - totalGatewayFeesKobo - totalRefundsKobo;

    if (format === "csv") {
      const csvLines: string[] = [
        `"DAILY SETTLEMENT RECONCILIATION REPORT - ${dateStr}"`,
        `"Generated At: ${new Date().toISOString()}"`,
        "",
        `"Order #","Payment Reference","Transaction Date","Customer Name","Customer Email","Subtotal (NGN)","Delivery (NGN)","Gross Total (NGN)","Paystack Gateway Fee (NGN)","Net Settlement (NGN)","Status"`,
      ];

      for (const row of transactionRows) {
        const subtotalNgn = (row.subtotalKobo / 100).toFixed(2);
        const deliveryNgn = (row.deliveryKobo / 100).toFixed(2);
        const grossNgn = (row.grossTotalKobo / 100).toFixed(2);
        const feeNgn = (row.paystackFeeKobo / 100).toFixed(2);
        const netNgn = (row.netPayoutKobo / 100).toFixed(2);

        csvLines.push(
          `"#${row.orderNumber}","${row.reference}","${row.createdAt}","${row.customerName.replace(/"/g, '""')}","${row.customerEmail}","${subtotalNgn}","${deliveryNgn}","${grossNgn}","${feeNgn}","${netNgn}","${row.status}"`
        );
      }

      csvLines.push("");
      csvLines.push(`"REFUNDS & RETURN REVERSALS"`);
      csvLines.push(`"Order #","Customer Name","Refund Amount (NGN)","Refund Method","Processed Date"`);
      for (const ref of refundRows) {
        csvLines.push(
          `"#${ref.orderNumber}","${ref.customerName.replace(/"/g, '""')}","${(ref.refundAmountKobo / 100).toFixed(2)}","${ref.refundMethod}","${ref.processedAt}"`
        );
      }

      csvLines.push("");
      csvLines.push(`"RECONCILIATION SUMMARY"`);
      csvLines.push(`"Total Paid Orders",${transactionRows.length}`);
      csvLines.push(`"Gross Volume (NGN)",${(grossVolumeKobo / 100).toFixed(2)}`);
      csvLines.push(`"Items Subtotal (NGN)",${(itemsSubtotalKobo / 100).toFixed(2)}`);
      csvLines.push(`"Delivery Fees Collected (NGN)",${(deliveryFeesKobo / 100).toFixed(2)}`);
      csvLines.push(`"Paystack Gateway Processing Fees (NGN)",${(totalGatewayFeesKobo / 100).toFixed(2)}`);
      csvLines.push(`"Total Refunds Processed (NGN)",${(totalRefundsKobo / 100).toFixed(2)}`);
      csvLines.push(`"NET EXPECTED PAYSTACK PAYOUT (NGN)",${(netSettlementPayoutKobo / 100).toFixed(2)}`);

      return new NextResponse(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="settlement-report-${dateStr}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settlementDate: dateStr,
      metrics: {
        orderCount: transactionRows.length,
        refundCount: refundRows.length,
        grossVolumeKobo,
        itemsSubtotalKobo,
        deliveryFeesKobo,
        totalGatewayFeesKobo,
        totalRefundsKobo,
        netSettlementPayoutKobo,
        grossVolumeFormatted: `₦${(grossVolumeKobo / 100).toLocaleString()}`,
        feesFormatted: `₦${(totalGatewayFeesKobo / 100).toLocaleString()}`,
        refundsFormatted: `₦${(totalRefundsKobo / 100).toLocaleString()}`,
        netPayoutFormatted: `₦${(netSettlementPayoutKobo / 100).toLocaleString()}`,
      },
      transactions: transactionRows,
      refunds: refundRows,
    });
  } catch (error: any) {
    console.error("Error generating settlement report:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate settlement report" },
      { status: 500 }
    );
  }
}
