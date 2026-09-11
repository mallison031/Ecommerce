import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        sector: true,
        adjustment_logs: {
          orderBy: { created_at: "desc" },
          take: 20,
        },
        stock_waitlist: {
          orderBy: { created_at: "desc" },
          take: 20,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { stock_qty, adjustment_type = "set", reason, notes, is_active } = body;

    let newStock = product.stock_qty;
    if (typeof stock_qty === "number") {
      if (adjustment_type === "increment") {
        newStock = product.stock_qty + stock_qty;
      } else if (adjustment_type === "decrement") {
        newStock = Math.max(0, product.stock_qty - stock_qty);
      } else {
        newStock = Math.max(0, stock_qty);
      }
    }

    const adjustmentDelta = newStock - product.stock_qty;

    // Run in transaction: update product and create audit log
    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          stock_qty: newStock,
          ...(typeof is_active === "boolean" ? { is_active } : {}),
        },
        include: {
          sector: true,
        },
      });

      let log = null;
      if (adjustmentDelta !== 0 || reason || notes) {
        log = await tx.stockAdjustmentLog.create({
          data: {
            product_id: id,
            previous_stock: product.stock_qty,
            new_stock: newStock,
            adjustment: adjustmentDelta,
            reason: reason || (adjustmentDelta > 0 ? "Stock restock" : "Stock adjustment"),
            notes: notes || null,
          },
        });
      }

      // If product was restocked from 0 to positive, mark waitlist entries as notified
      let waitlistNotifiedCount = 0;
      if (product.stock_qty <= 0 && newStock > 0) {
        const updateWaitlist = await tx.stockWaitlist.updateMany({
          where: { product_id: id, notified: false },
          data: { notified: true },
        });
        waitlistNotifiedCount = updateWaitlist.count;
      }

      return { updatedProduct, log, waitlistNotifiedCount };
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      product: result.updatedProduct,
      log: result.log,
      waitlistNotifiedCount: result.waitlistNotifiedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
