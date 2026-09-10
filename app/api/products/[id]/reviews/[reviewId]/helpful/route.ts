import { NextRequest, NextResponse } from "next/server";
import { markReviewHelpful } from "@/lib/reviews";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; reviewId: string } }
) {
  try {
    const { reviewId } = params;
    const updated = await markReviewHelpful(reviewId);

    return NextResponse.json({
      success: true,
      reviewId: updated.id,
      helpfulVotes: updated.helpful_votes,
    });
  } catch (error: unknown) {
    console.error("[Review Helpful Vote Error]:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
