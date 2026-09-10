import { prisma } from "@/lib/db/prisma";

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  verifiedBuyersCount: number;
  ratingDistribution: {
    5: { count: number; percentage: number };
    4: { count: number; percentage: number };
    3: { count: number; percentage: number };
    2: { count: number; percentage: number };
    1: { count: number; percentage: number };
  };
}

export interface CreateReviewInput {
  productId: string;
  customerName: string;
  customerEmail: string;
  rating: number; // 1 - 5
  headline?: string | null;
  comment: string;
  photoUrl?: string | null;
}

/**
 * Checks if the customer with this email previously purchased this product in a paid or delivered order.
 */
export async function isVerifiedBuyer(email: string, productId: string): Promise<boolean> {
  if (!email || !productId) return false;

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      product_id: productId,
      order: {
        customer: {
          email: {
            equals: email.trim().toLowerCase(),
            mode: "insensitive",
          },
        },
        status: {
          in: ["paid", "shipped", "delivered"],
        },
      },
    },
  });

  return Boolean(orderItem);
}

/**
 * Creates a new product review and automatically verifies buyer status.
 */
export async function createProductReview(input: CreateReviewInput) {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const verified = await isVerifiedBuyer(input.customerEmail, input.productId);

  const review = await prisma.productReview.create({
    data: {
      product_id: input.productId,
      customer_name: input.customerName.trim(),
      customer_email: input.customerEmail.trim().toLowerCase(),
      rating,
      headline: input.headline ? input.headline.trim() : null,
      comment: input.comment.trim(),
      photo_url: input.photoUrl ? input.photoUrl.trim() : null,
      is_verified_buyer: verified,
      is_approved: true, // Auto-publish with admin post-moderation
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return review;
}

/**
 * Fetches approved reviews and computes summary metrics for a given product.
 */
export async function getProductReviewsAndSummary(productId: string) {
  const reviews = await prisma.productReview.findMany({
    where: {
      product_id: productId,
      is_approved: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const totalReviews = reviews.length;
  const verifiedBuyersCount = reviews.filter((r) => r.is_verified_buyer).length;

  const distributionCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingSum = 0;

  for (const r of reviews) {
    ratingSum += r.rating;
    if (distributionCounts[r.rating] !== undefined) {
      distributionCounts[r.rating]++;
    }
  }

  const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

  const ratingDistribution = {
    5: {
      count: distributionCounts[5],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[5] / totalReviews) * 100) : 0,
    },
    4: {
      count: distributionCounts[4],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[4] / totalReviews) * 100) : 0,
    },
    3: {
      count: distributionCounts[3],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[3] / totalReviews) * 100) : 0,
    },
    2: {
      count: distributionCounts[2],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[2] / totalReviews) * 100) : 0,
    },
    1: {
      count: distributionCounts[1],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[1] / totalReviews) * 100) : 0,
    },
  };

  const summary: ReviewSummary = {
    averageRating,
    totalReviews,
    verifiedBuyersCount,
    ratingDistribution,
  };

  return { reviews, summary };
}

/**
 * Increment helpful votes for a review
 */
export async function markReviewHelpful(reviewId: string) {
  const updated = await prisma.productReview.update({
    where: { id: reviewId },
    data: {
      helpful_votes: {
        increment: 1,
      },
    },
  });
  return updated;
}

/**
 * Fetches all reviews for the Admin portal with optional status filtering.
 */
export async function getAdminReviews(status?: "all" | "approved" | "pending") {
  const where: any = {};
  if (status === "approved") where.is_approved = true;
  if (status === "pending") where.is_approved = false;

  const reviews = await prisma.productReview.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          sector: {
            select: { slug: true, name: true },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const totalReviews = await prisma.productReview.count();
  const approvedCount = await prisma.productReview.count({ where: { is_approved: true } });
  const pendingCount = await prisma.productReview.count({ where: { is_approved: false } });
  const verifiedCount = await prisma.productReview.count({ where: { is_verified_buyer: true } });

  const allRatings = await prisma.productReview.findMany({
    where: { is_approved: true },
    select: { rating: true },
  });

  const avgRating =
    allRatings.length > 0
      ? Number((allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1))
      : 5.0;

  return {
    reviews,
    metrics: {
      totalReviews,
      approvedCount,
      pendingCount,
      verifiedCount,
      averageStoreRating: avgRating,
    },
  };
}

/**
 * Updates review approval state in Admin portal
 */
export async function setReviewApproval(reviewId: string, isApproved: boolean) {
  return await prisma.productReview.update({
    where: { id: reviewId },
    data: { is_approved: isApproved },
  });
}

/**
 * Deletes a spam or abusive review
 */
export async function deleteReview(reviewId: string) {
  return await prisma.productReview.delete({
    where: { id: reviewId },
  });
}
