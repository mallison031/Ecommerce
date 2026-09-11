import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderIds, status, courier_name } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "orderIds array must be provided and not empty" },
        { status: 400 }
      );
    }

    if (!status || !["paid", "shipped", "delivered", "returned", "abandoned"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value provided" }, { status: 400 });
    }

    const dataToUpdate: Record<string, any> = {
      status,
      updated_at: new Date(),
    };

    if (status === "shipped") {
      dataToUpdate.shipped_at = new Date();
      if (courier_name) {
        dataToUpdate.courier_name = courier_name;
      }
    } else if (status === "delivered") {
      dataToUpdate.delivered_at = new Date();
    }

    const updateResult = await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
      },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count,
      message: `Successfully updated ${updateResult.count} orders to ${status}`,
    });
  } catch (error: any) {
    console.error("[Bulk Order Status POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
