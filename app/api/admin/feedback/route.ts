import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateNpsMetrics } from "@/lib/feedback/nps";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status"); // "completed" | "pending"

    const feedbacks = await prisma.deliveryFeedback.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        order: {
          select: {
            order_number: true,
            total_kobo: true,
            courier_name: true,
            delivered_at: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    const metrics = calculateNpsMetrics(feedbacks);

    // Compute popular tag counts
    const tagCounts: Record<string, number> = {};
    for (const fb of feedbacks) {
      if (Array.isArray(fb.feedback_tags)) {
        for (const tag of fb.feedback_tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    const popularTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      metrics,
      popular_tags: popularTags,
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        order_number: f.order.order_number,
        courier_name: f.order.courier_name,
        customer_name: f.customer?.name || "Customer",
        customer_email: f.customer?.email,
        nps_score: f.nps_score,
        category:
          typeof f.nps_score === "number"
            ? f.nps_score >= 9
              ? "Promoter"
              : f.nps_score >= 7
              ? "Passive"
              : "Detractor"
            : "Pending",
        delivery_speed_rating: f.delivery_speed_rating,
        packaging_rating: f.packaging_rating,
        product_quality_rating: f.product_quality_rating,
        feedback_tags: f.feedback_tags,
        comments: f.comments,
        status: f.status,
        submitted_at: f.submitted_at,
        created_at: f.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching feedback analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch feedback analytics" },
      { status: 500 }
    );
  }
}
