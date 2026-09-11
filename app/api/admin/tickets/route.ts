import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { SupportTicketStatus } from "@prisma/client";
import { createAdminAlert } from "@/lib/notifications/admin-alerts";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const query = searchParams.get("q")?.trim();

    // Compute metric counts
    const [total, open, escalated, closed] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: "open" } }),
      prisma.supportTicket.count({ where: { status: "escalated" } }),
      prisma.supportTicket.count({ where: { status: "closed" } }),
    ]);

    const whereClause: any = {};

    if (statusParam && statusParam !== "all") {
      whereClause.status = statusParam as SupportTicketStatus;
    }

    if (query) {
      whereClause.OR = [
        { customer_name: { contains: query, mode: "insensitive" } },
        { customer_email: { contains: query, mode: "insensitive" } },
        { whatsapp_phone_e164: { contains: query, mode: "insensitive" } },
        { subject: { contains: query, mode: "insensitive" } },
        { message: { contains: query, mode: "insensitive" } },
        { order: { order_number: !isNaN(parseInt(query, 10)) ? parseInt(query, 10) : undefined } },
      ];
    }

    const rawTickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
            total_kobo: true,
            courier_name: true,
            tracking_number: true,
            customer: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const tickets = rawTickets.map((t) => {
      // Build 1-click WhatsApp reply URL
      const cleanPhone = t.whatsapp_phone_e164.replace(/\+/g, "");
      const greetingName = t.customer_name || t.order?.customer?.name || "Customer";
      const subjectText = t.subject ? ` regarding "${t.subject}"` : "";
      const orderRef = t.order?.order_number ? ` for Order #${t.order.order_number}` : "";
      const defaultReplyMsg = encodeURIComponent(
        `Hello ${greetingName}, this is Customer Support at our Store${subjectText}${orderRef}. How can we assist you today?`
      );
      const whatsappReplyUrl = `https://wa.me/${cleanPhone}?text=${defaultReplyMsg}`;

      return {
        ...t,
        whatsappReplyUrl,
      };
    });

    return NextResponse.json({
      success: true,
      counts: { total, open, escalated, closed },
      tickets,
    });
  } catch (err: unknown) {
    console.error("[Admin Tickets GET Error]:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, status, adminNotes, resolutionNotes } = body;

    if (!ticketId) {
      return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });
    }

    const updateData: any = {};

    if (status) {
      const allowedStatuses: SupportTicketStatus[] = ["open", "escalated", "closed"];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid ticket status" }, { status: 400 });
      }
      updateData.status = status;
    }

    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    if (resolutionNotes !== undefined) {
      updateData.resolution_notes = resolutionNotes;
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
          },
        },
      },
    });

    if (status === "escalated") {
      await createAdminAlert({
        title: `Ticket Escalated: ${updated.subject || updated.id}`,
        message: `Ticket from ${updated.customer_name || updated.whatsapp_phone_e164} was escalated to priority handling.`,
        type: "ticket_opened",
        link: `/admin?tab=tickets`,
        referenceId: updated.id,
      });
    }

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err: unknown) {
    console.error("[Admin Tickets POST Error]:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const PATCH = POST;
