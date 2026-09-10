import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    const existing = await prisma.customerAddress.findFirst({
      where: { id, customer_id: customer.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const {
      label,
      recipient_name,
      phone,
      street_address,
      city,
      state,
      lga,
      is_default,
    } = body;

    const dataToUpdate: Record<string, any> = {};
    if (typeof label === "string") dataToUpdate.label = label.trim();
    if (typeof recipient_name === "string") dataToUpdate.recipient_name = recipient_name.trim();
    if (typeof phone === "string") dataToUpdate.phone = phone.trim();
    if (typeof street_address === "string") dataToUpdate.street_address = street_address.trim();
    if (typeof city === "string") dataToUpdate.city = city.trim();
    if (typeof state === "string") dataToUpdate.state = state.trim();
    if (typeof lga === "string") dataToUpdate.lga = lga.trim();
    if (typeof is_default === "boolean") dataToUpdate.is_default = is_default;

    const updated = await prisma.$transaction(async (tx) => {
      if (is_default === true) {
        await tx.customerAddress.updateMany({
          where: { customer_id: customer.id, id: { not: id } },
          data: { is_default: false },
        });
      }

      return tx.customerAddress.update({
        where: { id },
        data: dataToUpdate,
      });
    });

    return NextResponse.json({
      success: true,
      message: "Address updated successfully.",
      address: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const existing = await prisma.customerAddress.findFirst({
      where: { id, customer_id: customer.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    await prisma.customerAddress.delete({
      where: { id },
    });

    // If deleted address was default, set the next most recent address as default
    if (existing.is_default) {
      const nextAddress = await prisma.customerAddress.findFirst({
        where: { customer_id: customer.id },
        orderBy: { created_at: "desc" },
      });
      if (nextAddress) {
        await prisma.customerAddress.update({
          where: { id: nextAddress.id },
          data: { is_default: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Address deleted successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
