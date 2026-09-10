import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        customer_id: customer.id,
      },
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            total_kobo: true,
            currency: true,
            status: true,
            delivered_at: true,
            payment: {
              select: {
                paystack_reference: true,
                amount_kobo: true,
              },
            },
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

    if (!returnRequest) {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    return NextResponse.json({ return_request: returnRequest });
  } catch (error: any) {
    console.error("[Customer Return Details GET] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
