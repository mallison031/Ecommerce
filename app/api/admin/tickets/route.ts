import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { SupportTicketStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as SupportTicketStatus | null;

    const tickets = await prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
            total_kobo: true,
            customer: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ tickets });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, status } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ error: "Missing ticketId or status" }, { status: 400 });
    }

    const allowedStatuses: SupportTicketStatus[] = ["open", "escalated", "closed"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid ticket status" }, { status: 400 });
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
