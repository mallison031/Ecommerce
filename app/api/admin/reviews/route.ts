import { NextRequest, NextResponse } from "next/server";
import {
  getAdminReviews,
  setReviewApproval,
  deleteReview,
} from "@/lib/reviews";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as "all" | "approved" | "pending" | null;

    const data = await getAdminReviews(status || undefined);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    console.error("[Admin Reviews GET Error]:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { reviewId, isApproved } = body;

    if (!reviewId || typeof isApproved !== "boolean") {
      return NextResponse.json(
        { error: "reviewId and isApproved (boolean) are required." },
        { status: 400 }
      );
    }

    const updated = await setReviewApproval(reviewId, isApproved);

    return NextResponse.json({
      success: true,
      review: updated,
    });
  } catch (error: unknown) {
    console.error("[Admin Reviews PATCH Error]:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get("id");

    if (!reviewId) {
      return NextResponse.json({ error: "Review id is required." }, { status: 400 });
    }

    await deleteReview(reviewId);

    return NextResponse.json({
      success: true,
      message: "Review removed successfully.",
    });
  } catch (error: unknown) {
    console.error("[Admin Reviews DELETE Error]:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
