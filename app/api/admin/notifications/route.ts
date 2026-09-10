import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const logs = await prisma.messageNotificationLog.findMany({
      include: {
        order: {
          select: {
            order_number: true,
            customer: {
              select: { name: true, phone: true, email: true },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
