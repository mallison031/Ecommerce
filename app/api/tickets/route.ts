import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { formatToE164 } from "@/lib/utils";
import { createAdminAlert } from "@/lib/notifications/admin-alerts";
import { z } from "zod";

const ticketSchema = z
  .object({
    name: z.string().optional(),
    customerName: z.string().optional(),
    email: z.string().optional(),
    customerEmail: z.string().optional(),
    phone: z.string().optional(),
    customerPhone: z.string().optional(),
    category: z.string().optional(),
    subject: z.string().min(3, "Subject/topic is required"),
    message: z.string().min(10, "Please provide more details (at least 10 characters)"),
    orderNumber: z.union([z.string(), z.number()]).optional(),
  })
  .refine((data) => Boolean((data.name && data.name.length >= 2) || (data.customerName && data.customerName.length >= 2)), {
    message: "Name is required",
    path: ["name"],
  })
  .refine(
    (data) => {
      const e = data.email || data.customerEmail;
      return Boolean(e && z.string().email().safeParse(e).success);
    },
    {
      message: "Valid email is required",
      path: ["email"],
    }
  )
  .refine(
    (data) => {
      const p = data.phone || data.customerPhone;
      return Boolean(p && p.length >= 7);
    },
    {
      message: "Valid phone number is required",
      path: ["phone"],
    }
  );

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const rawName = (parsed.data.name || parsed.data.customerName)!.trim();
    const rawEmail = (parsed.data.email || parsed.data.customerEmail)!.trim();
    const rawPhone = (parsed.data.phone || parsed.data.customerPhone)!.trim();
    const { subject, message, orderNumber } = parsed.data;
    const formattedPhone = formatToE164(rawPhone);

    let linkedOrderId: string | undefined = undefined;

    if (orderNumber) {
      const parsedNum = typeof orderNumber === "number" ? orderNumber : parseInt(orderNumber, 10);
      if (!isNaN(parsedNum)) {
        const foundOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { order_number: parsedNum },
              { id: String(orderNumber) },
            ],
          },
          select: { id: true },
        });
        if (foundOrder) {
          linkedOrderId = foundOrder.id;
        }
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        customer_name: rawName,
        customer_email: rawEmail,
        whatsapp_phone_e164: formattedPhone,
        subject,
        message,
        order_id: linkedOrderId,
        status: "open",
      },
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
            total_kobo: true,
          },
        },
      },
    });

    // Notify admin
    await createAdminAlert({
      title: `New Support Ticket: ${subject}`,
      message: `${rawName} (${formattedPhone}) opened a support inquiry: "${message.slice(0, 80)}..."`,
      type: "ticket_opened",
      link: `/admin?tab=tickets`,
      referenceId: ticket.id,
    });

    return NextResponse.json(
      {
        success: true,
        ticket: {
          id: ticket.id,
          name: ticket.customer_name,
          subject: ticket.subject,
          status: ticket.status,
          created_at: ticket.created_at,
        },
        message: "Your inquiry has been submitted. Our support team will reach out via WhatsApp or email shortly.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[Customer Tickets API Error]:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
