import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import { notifyAdminReturnRequest } from "@/lib/whatsapp/send";
import { ReturnReason, RefundMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const returns = await prisma.returnRequest.findMany({
      where: { customer_id: customer.id },
      orderBy: { created_at: "desc" },
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            total_kobo: true,
            currency: true,
            status: true,
            delivered_at: true,
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
                image_urls: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ returns });
  } catch (error: any) {
    console.error("[Customer Returns GET] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      order_id,
      reason,
      customer_note,
      evidence_images,
      refund_method,
      pickup_address,
      items,
    } = body;

    if (!order_id || !reason || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order ID, reason, and at least one item are required" },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to this customer
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        items: true,
        customer: true,
        return_requests: {
          where: {
            status: { notIn: ["rejected", "cancelled"] },
          },
          include: { items: true },
        },
      },
    });

    if (!order || order.customer_id !== customer.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate return reason enum
    const validReasons: ReturnReason[] = [
      "damaged_defective",
      "wrong_item_delivered",
      "quality_not_as_expected",
      "size_fit_issue",
      "changed_mind",
      "other",
    ];
    if (!validReasons.includes(reason as ReturnReason)) {
      return NextResponse.json({ error: "Invalid return reason provided" }, { status: 400 });
    }

    // Validate refund method
    const validRefundMethods: RefundMethod[] = ["original_payment", "store_credit"];
    const chosenRefundMethod = validRefundMethods.includes(refund_method)
      ? (refund_method as RefundMethod)
      : "original_payment";

    // Validate items and calculate refund amount
    let totalRefundKobo = 0;
    const itemsToCreate: Array<{
      order_item_id: string;
      product_id: string | null;
      product_name_snapshot: string;
      unit_price_kobo: number;
      qty: number;
      item_refund_kobo: number;
    }> = [];

    for (const itemInput of items) {
      const orderItem = order.items.find((oi) => oi.id === itemInput.order_item_id);
      if (!orderItem) {
        return NextResponse.json(
          { error: `Item ${itemInput.order_item_id} not found in this order` },
          { status: 400 }
        );
      }

      const returnQty = parseInt(itemInput.qty, 10);
      if (isNaN(returnQty) || returnQty <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for item ${orderItem.product_name_snapshot}` },
          { status: 400 }
        );
      }

      // Check how many have already been returned in active RMA requests
      const alreadyReturnedQty = order.return_requests.reduce((sum, rma) => {
        const matchingItem = rma.items.find((ri) => ri.order_item_id === orderItem.id);
        return sum + (matchingItem ? matchingItem.qty : 0);
      }, 0);

      const availableToReturn = orderItem.qty - alreadyReturnedQty;
      if (returnQty > availableToReturn) {
        return NextResponse.json(
          {
            error: `Cannot return ${returnQty} of ${orderItem.product_name_snapshot}. Only ${availableToReturn} available for return.`,
          },
          { status: 400 }
        );
      }

      const itemRefundKobo = orderItem.unit_price_kobo_snapshot * returnQty;
      totalRefundKobo += itemRefundKobo;

      itemsToCreate.push({
        order_item_id: orderItem.id,
        product_id: orderItem.product_id,
        product_name_snapshot: orderItem.product_name_snapshot,
        unit_price_kobo: orderItem.unit_price_kobo_snapshot,
        qty: returnQty,
        item_refund_kobo: itemRefundKobo,
      });
    }

    // Generate unique RMA Number: e.g. RMA-2026-XXXXX
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const rma_number = `RMA-${year}-${randomSuffix}`;

    // Create return request and items in a database transaction
    const returnRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.returnRequest.create({
        data: {
          rma_number,
          order_id: order.id,
          customer_id: customer.id,
          status: "requested",
          reason: reason as ReturnReason,
          customer_note: customer_note?.trim() || null,
          evidence_images: Array.isArray(evidence_images) ? evidence_images : [],
          refund_method: chosenRefundMethod,
          pickup_address: pickup_address?.trim() || order.delivery_address,
          refund_amount_kobo: totalRefundKobo,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          items: true,
          order: true,
        },
      });

      return created;
    });

    // Notify admin via WhatsApp
    notifyAdminReturnRequest({
      rmaNumber: returnRequest.rma_number,
      orderNumber: order.order_number,
      customerName: customer.name,
      reason: returnRequest.reason,
      totalRefundKobo,
      orderId: order.id,
    }).catch((err) => console.error("[WhatsApp RMA Alert Error]:", err));

    return NextResponse.json({
      success: true,
      message: "Return request submitted successfully",
      return_request: returnRequest,
    });
  } catch (error: any) {
    console.error("[Customer Returns POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
