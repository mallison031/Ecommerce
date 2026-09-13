import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import { generateUnsubscribeToken } from "@/lib/marketing/campaigns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    let unsubscribeToken = customer.unsubscribe_token;
    if (!unsubscribeToken) {
      unsubscribeToken = generateUnsubscribeToken();
      await prisma.customer.update({
        where: { id: customer.id },
        data: { unsubscribe_token: unsubscribeToken },
      });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        marketing_emails_opt_in: customer.marketing_emails_opt_in,
        marketing_whatsapp_opt_in: customer.marketing_whatsapp_opt_in,
        replenishment_opt_in: customer.replenishment_opt_in,
        whatsapp_opt_in: customer.whatsapp_opt_in,
        unsubscribe_token: unsubscribeToken,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error: any) {
    console.error("Error fetching customer preferences:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      marketing_emails_opt_in,
      marketing_whatsapp_opt_in,
      replenishment_opt_in,
      whatsapp_opt_in,
    } = body;

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(typeof marketing_emails_opt_in === "boolean" ? { marketing_emails_opt_in } : {}),
        ...(typeof marketing_whatsapp_opt_in === "boolean" ? { marketing_whatsapp_opt_in } : {}),
        ...(typeof replenishment_opt_in === "boolean" ? { replenishment_opt_in } : {}),
        ...(typeof whatsapp_opt_in === "boolean" ? { whatsapp_opt_in } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notification and marketing preferences updated successfully",
      preferences: {
        marketing_emails_opt_in: updated.marketing_emails_opt_in,
        marketing_whatsapp_opt_in: updated.marketing_whatsapp_opt_in,
        replenishment_opt_in: updated.replenishment_opt_in,
        whatsapp_opt_in: updated.whatsapp_opt_in,
        email: updated.email,
      },
    });
  } catch (error: any) {
    console.error("Error updating customer preferences:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}
