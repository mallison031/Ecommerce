import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status");
    const sector = searchParams.get("sector");
    const format = searchParams.get("format");

    const where: Record<string, any> = {};

    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        if (to.length <= 10) {
          toDate.setHours(23, 59, 59, 999);
        }
        where.created_at.lte = toDate;
      }
    }

    if (status && status !== "all") {
      where.status = status;
    }

    // Load all active sectors for metadata and breakdown
    const allSectors = await prisma.sector.findMany({
      orderBy: { display_order: "asc" },
    });

    // If sector filter provided, match sector slug or sector ID
    let targetSectorId: string | null = null;
    if (sector && sector !== "all") {
      const foundSector = allSectors.find(
        (s) => s.slug.toLowerCase() === sector.toLowerCase() || s.id === sector
      );
      if (foundSector) {
        targetSectorId = foundSector.id;
      }
    }

    const allOrders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                sector: true,
              },
            },
          },
        },
        invoice: true,
        receipt: true,
        payment: true,
        sales_ledger: true,
      },
      orderBy: { created_at: "desc" },
    });

    // If a targetSectorId was specified, filter orders that include at least one item from that sector
    const filteredOrders = targetSectorId
      ? allOrders.filter((o) =>
          o.items.some((item) => item.product?.sector_id === targetSectorId)
        )
      : allOrders;

    // Confirmed orders are paid, shipped, or delivered
    const confirmedOrders = filteredOrders.filter((o) =>
      ["paid", "shipped", "delivered"].includes(o.status)
    );

    const grossRevenueKobo = confirmedOrders.reduce((sum, o) => sum + o.total_kobo, 0);
    const deliveredRevenueKobo = filteredOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + o.total_kobo, 0);
    const inTransitRevenueKobo = filteredOrders
      .filter((o) => o.status === "shipped")
      .reduce((sum, o) => sum + o.total_kobo, 0);
    const awaitingFulfillmentRevenueKobo = filteredOrders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + o.total_kobo, 0);
    const abandonedRevenueKobo = filteredOrders
      .filter((o) => o.status === "abandoned")
      .reduce((sum, o) => sum + o.total_kobo, 0);
    const returnedRevenueKobo = filteredOrders
      .filter((o) => o.status === "returned")
      .reduce((sum, o) => sum + o.total_kobo, 0);

    const paidOrdersCount = confirmedOrders.length;
    const abandonedCount = filteredOrders.filter((o) => o.status === "abandoned").length;
    const totalOrdersCount = filteredOrders.length;
    const averageOrderValueKobo =
      paidOrdersCount > 0 ? Math.round(grossRevenueKobo / paidOrdersCount) : 0;

    let totalUnitsSold = 0;
    const sectorStatsMap: Record<
      string,
      {
        id: string;
        name: string;
        slug: string;
        unitsSold: number;
        revenueKobo: number;
        orderCount: number;
      }
    > = {};

    for (const s of allSectors) {
      sectorStatsMap[s.id] = {
        id: s.id,
        name: s.name,
        slug: s.slug,
        unitsSold: 0,
        revenueKobo: 0,
        orderCount: 0,
      };
    }

    for (const order of confirmedOrders) {
      const sectorsInOrder = new Set<string>();
      for (const item of order.items) {
        totalUnitsSold += item.qty;
        const secId = item.product?.sector_id;
        if (secId && sectorStatsMap[secId]) {
          sectorStatsMap[secId].unitsSold += item.qty;
          sectorStatsMap[secId].revenueKobo += item.line_total_kobo;
          sectorsInOrder.add(secId);
        }
      }
      sectorsInOrder.forEach((secId) => {
        if (sectorStatsMap[secId]) {
          sectorStatsMap[secId].orderCount += 1;
        }
      });
    }

    const totalSectorRevenueKobo = Object.values(sectorStatsMap).reduce(
      (sum, s) => sum + s.revenueKobo,
      0
    );

    const sectorBreakdown = Object.values(sectorStatsMap).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      unitsSold: s.unitsSold,
      revenueKobo: s.revenueKobo,
      orderCount: s.orderCount,
      percentageShare:
        totalSectorRevenueKobo > 0
          ? Number(((s.revenueKobo / totalSectorRevenueKobo) * 100).toFixed(1))
          : 0,
    }));

    // CSV format handling
    if (format === "csv") {
      const headers = [
        "Order Number",
        "Date",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "WhatsApp Opt-In",
        "Status",
        "Payment Ref",
        "Invoice Number",
        "Receipt Number",
        "Courier",
        "Tracking Number",
        "Units Count",
        "Gross NGN",
        "Items Breakdown",
      ].join(",");

      const rows = filteredOrders.map((o) => {
        const dateStr = new Date(o.created_at).toISOString().split("T")[0];
        const units = o.items.reduce((sum, i) => sum + i.qty, 0);
        const grossNaira = (o.total_kobo / 100).toFixed(2);
        const itemsSummary = `"${o.items
          .map((i) => `${i.qty}x ${i.product_name_snapshot} (₦${(i.line_total_kobo / 100).toFixed(2)})`)
          .join(" | ")
          .replace(/"/g, '""')}"`;
        const invoiceNum = o.invoice ? `INV-${String(o.invoice.invoice_number).padStart(5, "0")}` : "";
        const receiptNum = o.receipt ? `REC-${String(o.receipt.receipt_number).padStart(5, "0")}` : "";
        const payRef = o.payment?.paystack_reference || "";
        const courier = o.courier_name || "";
        const tracking = o.tracking_number || "";

        return [
          o.order_number,
          dateStr,
          `"${o.customer.name.replace(/"/g, '""')}"`,
          `"${o.customer.email.replace(/"/g, '""')}"`,
          `"${o.customer.phone.replace(/"/g, '""')}"`,
          o.customer.whatsapp_opt_in ? "YES" : "NO",
          o.status,
          `"${payRef}"`,
          `"${invoiceNum}"`,
          `"${receiptNum}"`,
          `"${courier}"`,
          `"${tracking}"`,
          units,
          grossNaira,
          itemsSummary,
        ].join(",");
      });

      const csvContent = [headers, ...rows].join("\n");
      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sales-ledger-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (format === "sector_csv") {
      const headers = ["Sector Name", "Sector Slug", "Units Sold", "Revenue (NGN)", "Revenue Share (%)"].join(",");
      const rows = sectorBreakdown.map((s) =>
        [
          `"${s.name.replace(/"/g, '""')}"`,
          s.slug,
          s.unitsSold,
          (s.revenueKobo / 100).toFixed(2),
          s.percentageShare,
        ].join(",")
      );
      const csvContent = [headers, ...rows].join("\n");
      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sector-sales-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      // Backward-compatible fields
      totalOrders: totalOrdersCount,
      totalRevenueKobo: grossRevenueKobo,
      abandonedCount,
      orders: filteredOrders,
      // Enhanced Financial Metrics
      metrics: {
        grossRevenueKobo,
        deliveredRevenueKobo,
        inTransitRevenueKobo,
        awaitingFulfillmentRevenueKobo,
        abandonedRevenueKobo,
        returnedRevenueKobo,
        totalOrdersCount,
        paidOrdersCount,
        averageOrderValueKobo,
        totalUnitsSold,
      },
      sectorBreakdown,
      sectors: allSectors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
