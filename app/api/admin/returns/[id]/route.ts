import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { notifyCustomerReturnStatus } from "@/lib/whatsapp/send";
import { refundPaystackTransaction } from "@/lib/paystack";
import { createCoupon } from "@/lib/promotions";
import { ReturnStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: true,
            payment: true,
          },
        },
        customer: true,
        items: {
          include: {
            order_item: true,
            product: true,
          },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    return NextResponse.json({ return_request: returnRequest });
  } catch (error: any) {
    console.error("[Admin Return GET] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const {
      status,
      return_courier,
      return_tracking_num,
      admin_notes,
      rejection_reason,
      restock,
    } = body;

    const existingReturn = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            payment: true,
            items: true,
            return_requests: {
              include: { items: true },
            },
          },
        },
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!existingReturn) {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (return_courier !== undefined) updateData.return_courier = return_courier;
    if (return_tracking_num !== undefined) updateData.return_tracking_num = return_tracking_num;

    let storeCreditCode: string | undefined = undefined;

    // Status lifecycle transitions
    if (status) {
      const validStatuses: ReturnStatus[] = [
        "requested",
        "approved",
        "rejected",
        "in_transit",
        "received",
        "refunded",
        "cancelled",
      ];
      if (!validStatuses.includes(status as ReturnStatus)) {
        return NextResponse.json({ error: `Invalid return status: ${status}` }, { status: 400 });
      }

      updateData.status = status as ReturnStatus;

      if (status === "approved") {
        updateData.approved_at = new Date();
      } else if (status === "in_transit") {
        updateData.in_transit_at = new Date();
      } else if (status === "rejected") {
        updateData.rejection_reason = rejection_reason || admin_notes || "Return request declined after review.";
      } else if (status === "received") {
        updateData.received_at = new Date();

        // Warehouse restock upon receipt
        if (restock && !existingReturn.restocked) {
          updateData.restocked = true;
          for (const item of existingReturn.items) {
            if (item.product_id) {
              const currentProduct = await prisma.product.findUnique({
                where: { id: item.product_id },
              });
              if (currentProduct) {
                const newQty = currentProduct.stock_qty + item.qty;
                await prisma.product.update({
                  where: { id: item.product_id },
                  data: { stock_qty: newQty },
                });
                await prisma.stockAdjustmentLog.create({
                  data: {
                    product_id: item.product_id,
                    previous_stock: currentProduct.stock_qty,
                    new_stock: newQty,
                    adjustment: item.qty,
                    reason: "Customer Return Restock",
                    notes: `Restocked ${item.qty} units from ${existingReturn.rma_number}`,
                  },
                });
              }
            }
          }
        }
      } else if (status === "refunded") {
        updateData.refunded_at = new Date();

        // Process refund according to customer's chosen refund method
        if (existingReturn.refund_method === "store_credit") {
          const rawCode = `CREDIT-${existingReturn.rma_number.replace(/[^A-Za-z0-9]/g, "")}`;
          storeCreditCode = rawCode;
          try {
            createCoupon({
              code: rawCode,
              discountType: "FIXED_AMOUNT",
              discountValue: existingReturn.refund_amount_kobo,
              minSpendKobo: 0,
              usageLimit: 1,
              isActive: true,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              description: `Store credit refund for RMA ${existingReturn.rma_number}`,
            });
          } catch (couponErr) {
            console.warn("[Store Credit Coupon Warning]:", couponErr);
          }
          updateData.refund_reference = rawCode;
        } else {
          // Original payment method via Paystack refund
          const paystackRef = existingReturn.order.payment?.paystack_reference;
          if (paystackRef) {
            try {
              const refundRes = await refundPaystackTransaction({
                reference: paystackRef,
                amountKobo: existingReturn.refund_amount_kobo,
                merchantNote: `Refund for return ${existingReturn.rma_number}`,
              });
              updateData.refund_reference =
                typeof refundRes.data?.id === "string" || typeof refundRes.data?.id === "number"
                  ? String(refundRes.data.id)
                  : `ref_paystack_${Date.now()}`;
            } catch (paystackErr: any) {
              console.error("[Paystack Refund Error]:", paystackErr);
              updateData.refund_reference = `ref_manual_${Date.now()}`;
            }
          } else {
            updateData.refund_reference = `ref_direct_${Date.now()}`;
          }
        }

        // Check if full order is returned/refunded, and update order status
        const totalOrderQty = existingReturn.order.items.reduce((s, i) => s + i.qty, 0);
        const totalReturnedQty = existingReturn.order.return_requests
          .filter((r) => r.status === "refunded" || r.id === id)
          .reduce((s, r) => s + r.items.reduce((sum, item) => sum + item.qty, 0), 0);

        if (totalReturnedQty >= totalOrderQty) {
          await prisma.order.update({
            where: { id: existingReturn.order_id },
            data: { status: "returned" },
          });
        }
      }
    }

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: updateData,
      include: {
        order: true,
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Notify customer via WhatsApp
    const customerPhone =
      existingReturn.customer.whatsapp_phone_e164 || existingReturn.customer.phone;
    if (customerPhone && status) {
      notifyCustomerReturnStatus({
        toE164: customerPhone,
        orderNumber: existingReturn.order.order_number,
        rmaNumber: updated.rma_number,
        status: updated.status,
        refundAmountKobo: updated.refund_amount_kobo,
        refundMethod: updated.refund_method,
        orderId: existingReturn.order_id,
        trackingNumber: updated.return_tracking_num || undefined,
        courierName: updated.return_courier || undefined,
        creditCode: storeCreditCode,
        note: updated.rejection_reason || updated.admin_notes || undefined,
      }).catch((err) => console.error("[WhatsApp Customer Return Update Error]:", err));
    }

    return NextResponse.json({
      success: true,
      message: `Return request updated to '${updated.status}'`,
      return_request: updated,
      store_credit_code: storeCreditCode,
    });
  } catch (error: any) {
    console.error("[Admin Return PATCH] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
