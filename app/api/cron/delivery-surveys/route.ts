import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateSurveyToken } from "@/lib/feedback/nps";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const now = new Date();
    // Orders delivered at least 1 day ago (or delivered without feedback survey sent)
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: "delivered",
        delivery_feedback: null,
      },
      include: {
        customer: true,
      },
      take: 50,
      orderBy: { delivered_at: "asc" },
    });

    const dispatchedSurveys: any[] = [];

    for (const order of deliveredOrders) {
      const surveyToken = generateSurveyToken();

      const feedback = await prisma.deliveryFeedback.create({
        data: {
          order_id: order.id,
          customer_id: order.customer_id,
          survey_token: surveyToken,
          survey_sent_at: now,
          status: "pending",
        },
      });

      dispatchedSurveys.push({
        id: feedback.id,
        order_id: order.id,
        order_number: order.order_number,
        customer_email: order.customer?.email,
        customer_phone: order.customer?.whatsapp_phone_e164 || order.customer?.phone,
        survey_token: surveyToken,
        survey_url: `/feedback/${surveyToken}`,
        sent_at: now.toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Delivery survey sweep processed ${dispatchedSurveys.length} orders`,
      surveys_dispatched: dispatchedSurveys.length,
      processedDeliveredOrders: dispatchedSurveys.length,
      dispatched: dispatchedSurveys,
    });
  } catch (error: any) {
    console.error("Error running delivery surveys cron sweep:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process delivery survey sweep" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
