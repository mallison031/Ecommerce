import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { POPULAR_FEEDBACK_TAGS } from "@/lib/feedback/nps";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } | Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const token = resolvedParams.token;

    const feedback = await prisma.deliveryFeedback.findUnique({
      where: { survey_token: token },
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
            courier_name: true,
            tracking_number: true,
            delivered_at: true,
            items: {
              select: {
                id: true,
                product_name_snapshot: true,
                qty: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { success: false, error: "Survey not found or invalid token" },
        { status: 404 }
      );
    }

    const surveyPayload = {
      id: feedback.id,
      token: feedback.survey_token,
      status: feedback.status,
      submitted_at: feedback.submitted_at,
      nps_score: feedback.nps_score,
      delivery_speed_rating: feedback.delivery_speed_rating,
      packaging_rating: feedback.packaging_rating,
      product_quality_rating: feedback.product_quality_rating,
      feedback_tags: feedback.feedback_tags,
      comments: feedback.comments,
    };

    return NextResponse.json({
      success: true,
      feedback: surveyPayload,
      survey: surveyPayload,
      popular_tags: POPULAR_FEEDBACK_TAGS,
      order: {
        id: feedback.order.id,
        order_number: feedback.order.order_number,
        courier_name: feedback.order.courier_name || "Express Courier",
        tracking_number: feedback.order.tracking_number,
        delivered_at: feedback.order.delivered_at,
        items: feedback.order.items,
      },
      customer: {
        name: feedback.customer?.name || "Valued Shopper",
      },
    });
  } catch (error: any) {
    console.error("Error fetching survey details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch survey details" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } | Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const token = resolvedParams.token;
    const body = await req.json();

    const {
      nps_score,
      delivery_speed_rating,
      packaging_rating,
      product_quality_rating,
      feedback_tags = [],
      comments = "",
    } = body;

    const nps = Number(nps_score);
    if (isNaN(nps) || nps < 1 || nps > 10) {
      return NextResponse.json(
        { success: false, error: "NPS score must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    const existing = await prisma.deliveryFeedback.findUnique({
      where: { survey_token: token },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Survey not found or invalid token" },
        { status: 404 }
      );
    }

    const updated = await prisma.deliveryFeedback.update({
      where: { survey_token: token },
      data: {
        nps_score: Math.round(nps),
        delivery_speed_rating: delivery_speed_rating ? Math.max(1, Math.min(5, Number(delivery_speed_rating))) : null,
        packaging_rating: packaging_rating ? Math.max(1, Math.min(5, Number(packaging_rating))) : null,
        product_quality_rating: product_quality_rating ? Math.max(1, Math.min(5, Number(product_quality_rating))) : null,
        feedback_tags: Array.isArray(feedback_tags) ? feedback_tags : [],
        comments: typeof comments === "string" ? comments.trim() : null,
        status: "completed",
        submitted_at: new Date(),
      },
    });

    const isPromoter = Math.round(nps) >= 9;

    return NextResponse.json({
      success: true,
      message: "Thank you! Your feedback has been submitted successfully.",
      feedback: updated,
      is_promoter: isPromoter,
    });
  } catch (error: any) {
    console.error("Error submitting delivery feedback:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit survey feedback" },
      { status: 500 }
    );
  }
}
