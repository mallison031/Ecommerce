import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const format = searchParams.get("format") || "json";

    const whereClause: any = {};
    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        whereClause.id = { in: ids };
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: true,
      },
      orderBy: { order_number: "asc" },
    });

    if (orders.length === 0) {
      return NextResponse.json({ error: "No orders found for manifest" }, { status: 404 });
    }

    // 1. Calculate Warehouse Picking Summary (SKU & total qty needed)
    const pickingMap: Record<string, { name: string; totalQty: number }> = {};
    let totalUnits = 0;
    let totalGrossKobo = 0;

    for (const ord of orders) {
      totalGrossKobo += ord.total_kobo;
      for (const item of ord.items) {
        const key = item.product_name_snapshot;
        if (!pickingMap[key]) {
          pickingMap[key] = { name: key, totalQty: 0 };
        }
        pickingMap[key].totalQty += item.qty;
        totalUnits += item.qty;
      }
    }

    const pickingSummary = Object.values(pickingMap).sort((a, b) => b.totalQty - a.totalQty);
    const dateStr = new Date().toISOString().split("T")[0];

    // CSV format
    if (format === "csv") {
      const csvLines: string[] = [
        `"DAILY WAREHOUSE DISPATCH MANIFEST - ${dateStr}"`,
        `"Generated At: ${new Date().toISOString()}"`,
        `"Total Orders: ${orders.length}","Total Units to Pick: ${totalUnits}","Gross Value: NGN ${(totalGrossKobo / 100).toFixed(2)}"`,
        "",
        `"WAREHOUSE PICK LIST SUMMARY"`,
        `"Product Name","Total Qty Needed"`,
      ];

      for (const pick of pickingSummary) {
        csvLines.push(`"${pick.name.replace(/"/g, '""')}",${pick.totalQty}`);
      }

      csvLines.push("");
      csvLines.push(`"COURIER DISPATCH STOPS & RECIPIENTS"`);
      csvLines.push(
        `"Stop #","Order #","Customer Name","Phone","Delivery Address","Items Summary","Total Value (NGN)","Courier","Tracking #","Status"`
      );

      orders.forEach((ord, index) => {
        const itemsSummary = ord.items.map((i) => `${i.qty}x ${i.product_name_snapshot}`).join(" | ");
        const totalNgn = (ord.total_kobo / 100).toFixed(2);
        csvLines.push(
          `"${index + 1}","#${ord.order_number}","${ord.customer.name.replace(/"/g, '""')}","${ord.customer.phone}","${ord.delivery_address.replace(/"/g, '""')}","${itemsSummary.replace(/"/g, '""')}","${totalNgn}","${ord.courier_name || "Unassigned"}","${ord.tracking_number || "Pending"}","${ord.status}"`
        );
      });

      return new NextResponse(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="dispatch-manifest-${dateStr}.csv"`,
        },
      });
    }

    // Printable HTML format
    if (format === "html") {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Warehouse Dispatch Manifest - ${dateStr}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #1e293b; }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
    h2 { font-size: 15px; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
    p.meta { font-size: 12px; color: #64748b; margin-top: 0; }
    .kpi-row { display: flex; gap: 16px; margin: 16px 0; }
    .kpi { border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; flex: 1; }
    .kpi span { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .kpi strong { display: block; font-size: 18px; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
    th { background: #f8fafc; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; font-weight: 700; color: #334155; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .sign-row { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
    .sign-box { border-top: 1px solid #475569; width: 220px; padding-top: 6px; text-align: center; }
    @media print {
      body { margin: 15mm 10mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px;">
    <button onclick="window.print()" style="background:#0f172a;color:#fff;padding:8px 16px;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">🖨️ Print Manifest</button>
  </div>

  <h1>AURA COMMERCE — DAILY WAREHOUSE DISPATCH MANIFEST</h1>
  <p class="meta">Generated: ${new Date().toLocaleString("en-NG")} | Batch Date: ${dateStr}</p>

  <div class="kpi-row">
    <div class="kpi">
      <span>Total Orders</span>
      <strong>${orders.length} Orders</strong>
    </div>
    <div class="kpi">
      <span>Total Items to Pick</span>
      <strong>${totalUnits} Units</strong>
    </div>
    <div class="kpi">
      <span>Total Batch Value</span>
      <strong>₦${(totalGrossKobo / 100).toLocaleString()}</strong>
    </div>
  </div>

  <h2>1. Warehouse Item Pick List Summary</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">Check</th>
        <th>Product SKU / Name</th>
        <th style="text-align: right; width: 120px;">Total Qty Needed</th>
      </tr>
    </thead>
    <tbody>
      ${pickingSummary
        .map(
          (p) => `
        <tr>
          <td style="text-align:center;"><input type="checkbox" style="width:16px;height:16px;" /></td>
          <td><strong>${p.name}</strong></td>
          <td style="text-align: right; font-weight: bold;">${p.totalQty} unit${p.totalQty > 1 ? "s" : ""}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <h2>2. Courier Dispatch Stops & Recipient Manifest</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 40px;">Stop</th>
        <th style="width: 80px;">Order #</th>
        <th>Recipient & Phone</th>
        <th>Delivery Address</th>
        <th>Packed Items</th>
        <th style="text-align: right; width: 90px;">Total (NGN)</th>
      </tr>
    </thead>
    <tbody>
      ${orders
        .map(
          (o, idx) => `
        <tr>
          <td style="font-weight:bold; text-align:center;">${idx + 1}</td>
          <td style="font-weight:bold;">#${o.order_number}</td>
          <td>
            <strong>${o.customer.name}</strong><br/>
            <span style="color:#64748b;font-size:11px;">${o.customer.phone}</span>
          </td>
          <td>${o.delivery_address}</td>
          <td>${o.items.map((it) => `${it.qty}x ${it.product_name_snapshot}`).join("<br/>")}</td>
          <td style="text-align: right; font-weight: bold;">₦${(o.total_kobo / 100).toLocaleString()}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="sign-row">
    <div class="sign-box">
      <strong>Warehouse Dispatch Officer</strong><br/>
      Signature & Date
    </div>
    <div class="sign-box">
      <strong>Logistics Courier Representative</strong><br/>
      Signature & Date
    </div>
  </div>
</body>
</html>`;

      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({
      success: true,
      manifestDate: dateStr,
      metrics: {
        totalOrders: orders.length,
        totalUnits,
        totalGrossKobo,
        totalGrossFormatted: `₦${(totalGrossKobo / 100).toLocaleString()}`,
      },
      pickingSummary,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer.name,
        customerPhone: o.customer.phone,
        deliveryAddress: o.delivery_address,
        totalKobo: o.total_kobo,
        status: o.status,
        courierName: o.courier_name,
        trackingNumber: o.tracking_number,
        itemsCount: o.items.reduce((acc, it) => acc + it.qty, 0),
        items: o.items.map((it) => ({
          name: it.product_name_snapshot,
          qty: it.qty,
          lineTotalKobo: it.line_total_kobo,
        })),
      })),
    });
  } catch (error: any) {
    console.error("[Orders Manifest GET] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
