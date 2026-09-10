import { NextRequest, NextResponse } from "next/server";
import {
  getProductReviewsAndSummary,
  createProductReview,
} from "@/lib/reviews";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check product exists (by id or by slug)
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { reviews, summary } = await getProductReviewsAndSummary(product.id);

    return NextResponse.json({
      success: true,
      productId: product.id,
      productName: product.name,
      summary,
      reviews,
    });
  } catch (error: unknown) {
    console.error("[Product Reviews GET Error]:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { customerName, customerEmail, rating, headline, comment, photoUrl } = body;

    if (!customerName || !customerEmail || !comment) {
      return NextResponse.json(
        { error: "Customer name, email, and review comment are required." },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5 stars." },
        { status: 400 }
      );
    }

    // Resolve product ID if slug was passed
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const newReview = await createProductReview({
      productId: product.id,
      customerName,
      customerEmail,
      rating: numRating,
      headline,
      comment,
      photoUrl,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Review submitted successfully!",
        review: newReview,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Product Reviews POST Error]:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
