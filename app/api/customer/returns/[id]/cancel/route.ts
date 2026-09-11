import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function POST(
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
    });

    if (!returnRequest) {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    if (returnRequest.status !== "requested") {
      return NextResponse.json(
        { error: `Cannot cancel return request in '${returnRequest.status}' status` },
        { status: 400 }
      );
    }

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status: "cancelled",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Return request cancelled",
      return_request: updated,
    });
  } catch (error: any) {
    console.error("[Customer Return Cancel POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
