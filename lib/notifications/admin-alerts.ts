import { prisma } from "@/lib/db/prisma";

export interface CreateAdminAlertParams {
  type: "order_paid" | "low_stock" | "rma_requested" | "ticket_opened" | "order_shipped";
  title: string;
  message: string;
  link?: string;
  referenceId?: string;
}

export async function createAdminAlert(params: CreateAdminAlertParams) {
  try {
    return await prisma.adminNotification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        reference_id: params.referenceId,
      },
    });
  } catch (error) {
    console.error("[Admin Alert Error]", error);
    return null;
  }
}
