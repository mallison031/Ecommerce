import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { initializePaystackTransaction } from "@/lib/paystack";
import { formatToE164 } from "@/lib/utils";
import { calculateShippingFee } from "@/lib/shipping";
import { validateCoupon, recordCouponRedemption } from "@/lib/promotions";
import { z } from "zod";

const checkoutSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(8, "Valid phone number is required"),
  deliveryAddress: z.string().min(5, "Delivery address is required"),
  state: z.string().optional(),
  lagosZone: z.string().optional(),
  isExpress: z.boolean().optional().default(false),
  couponCode: z.string().optional(),
  giftCardCode: z.string().optional(),
  whatsappOptIn: z.boolean().default(false),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        customEngraving: z.string().optional(),
        engravingFont: z.string().optional(),
        giftWrap: z.boolean().optional().default(false),
      })
    )
    .min(1, "At least one item is required in cart"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      phone,
      deliveryAddress,
      state,
      lagosZone,
      isExpress,
      couponCode,
      giftCardCode,
      whatsappOptIn,
      items,
    } = parsed.data;

    // Fetch product information (using unique product IDs)
    const uniqueProductIds = Array.from(new Set(items.map((i) => i.productId)));
    const products = await prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        is_active: true,
      },
    });

    if (products.length !== uniqueProductIds.length) {
      return NextResponse.json(
        { error: "One or more products in your cart are no longer available." },
        { status: 400 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const now = new Date();

    // Check active flash sales for discounted pricing
    const activeFlashProducts = await prisma.flashSaleProduct.findMany({
      where: {
        product_id: { in: uniqueProductIds },
        flash_sale: {
          is_active: true,
          start_time: { lte: now },
          end_time: { gt: now },
        },
      },
      include: {
        flash_sale: {
          select: { discount_percentage: true },
        },
      },
    });

    const flashDiscountMap = new Map<string, number>();
    for (const afp of activeFlashProducts) {
      flashDiscountMap.set(afp.product_id, afp.flash_sale.discount_percentage);
    }

    // Calculate totals & line items with price snapshots and customization
    let subtotalKobo = 0;
    const orderItemsData = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const flashDiscount = flashDiscountMap.get(product.id) || 0;
      const basePrice =
        flashDiscount > 0
          ? Math.round(product.price_kobo * ((100 - flashDiscount) / 100))
          : product.price_kobo;
      const giftWrapAddon = item.giftWrap ? 150000 : 0;
      const unitPriceKobo = basePrice + giftWrapAddon;
      const lineTotal = unitPriceKobo * item.quantity;
      subtotalKobo += lineTotal;

      return {
        product_id: product.id,
        product_name_snapshot: product.name,
        unit_price_kobo_snapshot: unitPriceKobo,
        qty: item.quantity,
        line_total_kobo: lineTotal,
        custom_engraving: item.customEngraving ? item.customEngraving.trim() : null,
        engraving_font: item.engravingFont ? item.engravingFont.trim() : null,
        gift_wrap: Boolean(item.giftWrap),
      };
    });

    // Calculate dynamic shipping fee
    let shippingFeeKobo = 0;
    let deliverySla = "2–4 Business Days";
    let isFreeDelivery = false;
    if (state) {
      const shippingCalc = calculateShippingFee({
        state,
        lagosZone,
        subtotalKobo,
        isExpress,
      });
      shippingFeeKobo = shippingCalc.shippingFeeKobo;
      deliverySla = shippingCalc.deliverySla;
      isFreeDelivery = shippingCalc.isFreeDelivery;
    }

    // Apply optional promo coupon
    let couponDiscountKobo = 0;
    let shippingDiscountKobo = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode && couponCode.trim()) {
      const couponRes = validateCoupon({
        code: couponCode,
        subtotalKobo,
        currentShippingFeeKobo: shippingFeeKobo,
      });

      if (!couponRes.valid) {
        return NextResponse.json({ error: couponRes.message }, { status: 400 });
      }

      couponDiscountKobo = couponRes.discountKobo;
      shippingDiscountKobo = couponRes.shippingDiscountKobo;
      appliedCouponCode = couponRes.coupon?.code || couponCode.toUpperCase();
      shippingFeeKobo = Math.max(0, shippingFeeKobo - shippingDiscountKobo);
      recordCouponRedemption(couponCode);
    }

    const subtotalAfterCouponKobo = Math.max(0, subtotalKobo - couponDiscountKobo);
    const orderTotalBeforeGiftCard = subtotalAfterCouponKobo + shippingFeeKobo;

    // Optional Gift Card / Store Credit validation
    let giftCardDeductionKobo = 0;
    let validatedGiftCard: any = null;

    if (giftCardCode && giftCardCode.trim()) {
      const gc = await prisma.giftCard.findUnique({
        where: { code: giftCardCode.trim().toUpperCase() },
      });

      if (gc && gc.is_active && (!gc.expires_at || gc.expires_at > now) && gc.balance_kobo > 0) {
        validatedGiftCard = gc;
        giftCardDeductionKobo = Math.min(gc.balance_kobo, orderTotalBeforeGiftCard);
      } else {
        return NextResponse.json(
          { error: "Provided gift card code is invalid, expired, or has no remaining balance." },
          { status: 400 }
        );
      }
    }

    const finalTotalKobo = Math.max(0, orderTotalBeforeGiftCard - giftCardDeductionKobo);

    // Format phone to E.164 if WhatsApp opted in
    const formattedPhone = whatsappOptIn ? formatToE164(phone) : null;

    // Upsert customer
    const customer = await prisma.customer.upsert({
      where: { email },
      update: {
        name,
        phone,
        whatsapp_opt_in: whatsappOptIn,
        whatsapp_phone_e164: formattedPhone,
      },
      create: {
        name,
        email,
        phone,
        whatsapp_opt_in: whatsappOptIn,
        whatsapp_phone_e164: formattedPhone,
      },
    });

    const fullAddress = state
      ? `${deliveryAddress} (${state}${state.toLowerCase() === "lagos" && lagosZone ? `, ${lagosZone === "lagos_island" ? "Island" : "Mainland"}` : ""})`
      : deliveryAddress;

    // Create Order with appropriate status
    const isFullGiftCardPayment = finalTotalKobo === 0 && giftCardDeductionKobo > 0;
    const order = await prisma.order.create({
      data: {
        customer_id: customer.id,
        status: isFullGiftCardPayment ? "paid" : "pending_payment",
        subtotal_kobo: subtotalKobo,
        total_kobo: finalTotalKobo,
        gift_card_discount_kobo: giftCardDeductionKobo,
        currency: "NGN",
        delivery_address: fullAddress,
        paid_at: isFullGiftCardPayment ? new Date() : null,
        items: {
          create: orderItemsData,
        },
      },
    });

    // Record gift card redemption if applied
    if (validatedGiftCard && giftCardDeductionKobo > 0) {
      await prisma.$transaction([
        prisma.giftCardRedemption.create({
          data: {
            gift_card_id: validatedGiftCard.id,
            order_id: order.id,
            amount_kobo: giftCardDeductionKobo,
          },
        }),
        prisma.giftCard.update({
          where: { id: validatedGiftCard.id },
          data: {
            balance_kobo: validatedGiftCard.balance_kobo - giftCardDeductionKobo,
          },
        }),
      ]);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/order-confirmation?order=${order.id}`;

    // If fully covered by gift card, return success directly without Paystack redirect
    if (isFullGiftCardPayment) {
      return NextResponse.json({
        success: true,
        paidWithGiftCard: true,
        authorizationUrl: callbackUrl,
        orderNumber: order.order_number,
        orderId: order.id,
        subtotalKobo,
        couponCode: appliedCouponCode,
        couponDiscountKobo,
        giftCardCode: validatedGiftCard?.code,
        giftCardDeductionKobo,
        shippingFeeKobo,
        totalKobo: 0,
        deliverySla,
        isFreeDelivery,
      });
    }

    // Initialize Paystack transaction for remaining balance
    const reference = `ord_${order.order_number}_${Date.now()}`;

    const paystackResult = await initializePaystackTransaction({
      email,
      amountKobo: finalTotalKobo,
      reference,
      callbackUrl,
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number,
        subtotalKobo,
        couponCode: appliedCouponCode,
        couponDiscountKobo,
        giftCardCode: validatedGiftCard?.code,
        giftCardDeductionKobo,
        shippingFeeKobo,
        isFreeDelivery,
        deliverySla,
        state: state || "Lagos",
      },
    });

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackResult.data.authorization_url,
      orderNumber: order.order_number,
      orderId: order.id,
      subtotalKobo,
      couponCode: appliedCouponCode,
      couponDiscountKobo,
      giftCardCode: validatedGiftCard?.code,
      giftCardDeductionKobo,
      shippingFeeKobo,
      totalKobo: finalTotalKobo,
      deliverySla,
      isFreeDelivery,
    });
  } catch (error: unknown) {
    console.error("[Checkout] Error during checkout initialization:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
