import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ReturnStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search")?.trim().toLowerCase();

    const whereClause: any = {};

    if (statusParam && statusParam !== "all") {
      whereClause.status = statusParam as ReturnStatus;
    }

    if (searchParam) {
      whereClause.OR = [
        { rma_number: { contains: searchParam, mode: "insensitive" } },
        { customer: { name: { contains: searchParam, mode: "insensitive" } } },
        { customer: { email: { contains: searchParam, mode: "insensitive" } } },
        { customer: { phone: { contains: searchParam, mode: "insensitive" } } },
        { return_tracking_num: { contains: searchParam, mode: "insensitive" } },
      ];

      // If search query is numeric, also search order_number
      const numericQuery = parseInt(searchParam, 10);
      if (!isNaN(numericQuery)) {
        whereClause.OR.push({ order: { order_number: numericQuery } });
      }
    }

    const returns = await prisma.returnRequest.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            total_kobo: true,
            subtotal_kobo: true,
            currency: true,
            status: true,
            delivery_address: true,
            delivered_at: true,
            payment: {
              select: {
                paystack_reference: true,
                amount_kobo: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsapp_phone_e164: true,
          },
        },
        items: {
          include: {
            order_item: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                stock_qty: true,
                image_urls: true,
              },
            },
          },
        },
      },
    });

    // Calculate metrics across all returns
    const allReturns = await prisma.returnRequest.findMany({
      select: {
        status: true,
        refund_amount_kobo: true,
      },
    });

    const metrics = {
      total: allReturns.length,
      requested: allReturns.filter((r) => r.status === "requested").length,
      approved: allReturns.filter((r) => r.status === "approved").length,
      in_transit: allReturns.filter((r) => r.status === "in_transit").length,
      received: allReturns.filter((r) => r.status === "received").length,
      refunded: allReturns.filter((r) => r.status === "refunded").length,
      rejected: allReturns.filter((r) => r.status === "rejected").length,
      cancelled: allReturns.filter((r) => r.status === "cancelled").length,
      totalRefundedKobo: allReturns
        .filter((r) => r.status === "refunded")
        .reduce((sum, r) => sum + r.refund_amount_kobo, 0),
    };

    return NextResponse.json({
      returns,
      metrics,
    });
  } catch (error: any) {
    console.error("[Admin Returns GET] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
