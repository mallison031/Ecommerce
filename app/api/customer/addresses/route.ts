import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function GET(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const addresses = await prisma.customerAddress.findMany({
      where: { customer_id: customer.id },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    });

    return NextResponse.json({ success: true, addresses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
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
      label = "Home",
      recipient_name,
      phone,
      street_address,
      city,
      state,
      lga,
      is_default,
    } = body;

    if (!recipient_name || !phone || !street_address || !state) {
      return NextResponse.json(
        { error: "Recipient name, phone number, street address, and State are required." },
        { status: 400 }
      );
    }

    // Check if this is the customer's first address
    const existingCount = await prisma.customerAddress.count({
      where: { customer_id: customer.id },
    });

    const makeDefault = Boolean(is_default) || existingCount === 0;

    // Transaction to update defaults and create address
    const address = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.customerAddress.updateMany({
          where: { customer_id: customer.id, is_default: true },
          data: { is_default: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          customer_id: customer.id,
          label: String(label).trim() || "Home",
          recipient_name: String(recipient_name).trim(),
          phone: String(phone).trim(),
          street_address: String(street_address).trim(),
          city: city ? String(city).trim() : null,
          state: String(state).trim(),
          lga: lga ? String(lga).trim() : null,
          is_default: makeDefault,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Delivery address saved successfully.",
      address,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
