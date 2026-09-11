"use client";

import React, { useState, useEffect } from "react";
import {
  Star,
  ShieldCheck,
  ThumbsUp,
  Camera,
  MessageSquare,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
} from "lucide-react";

export interface ReviewItem {
  id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  headline: string | null;
  comment: string;
  photo_url: string | null;
  is_verified_buyer: boolean;
  helpful_votes: number;
  created_at: string | Date;
}

export interface ReviewSummaryData {
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

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  initialReviews: ReviewItem[];
  initialSummary: ReviewSummaryData;
}

export function ProductReviewsSection({
  productId,
  productName,
  initialReviews,
  initialSummary,
}: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [summary, setSummary] = useState<ReviewSummaryData>(initialSummary);
  const [activeFilter, setActiveFilter] = useState<"all" | "photos" | "verified" | "5star">("all");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  // Form State
  const [formRating, setFormRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formHeadline, setFormHeadline] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Helpful votes tracking
  const [votedMap, setVotedMap] = useState<Record<string, boolean>>({});

  // Auto-detect magic 1-click review link query params (?review=true&name=...&email=...&rating=5)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("review") === "true") {
      const name = params.get("name");
      const email = params.get("email");
      const rating = params.get("rating");
      if (name) setFormName(decodeURIComponent(name));
      if (email) setFormEmail(decodeURIComponent(email));
      if (rating && !isNaN(Number(rating))) {
        setFormRating(Math.max(1, Math.min(5, Number(rating))));
      }
      setShowReviewModal(true);

      // Smooth scroll to review section
      setTimeout(() => {
        const elem = document.getElementById("customer-reviews-section");
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 350);
    }
  }, []);

  const handleHelpfulVote = async (reviewId: string) => {
    if (votedMap[reviewId]) return;

    // Optimistic update
    setVotedMap((prev) => ({ ...prev, [reviewId]: true }));
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpful_votes: r.helpful_votes + 1 } : r))
    );

    try {
      await fetch(`/api/products/${productId}/reviews/${reviewId}/helpful`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed recording helpful vote:", e);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formEmail.trim() || !formComment.trim()) {
      setFormError("Please enter your name, email, and detailed review feedback.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formName.trim(),
          customerEmail: formEmail.trim(),
          rating: formRating,
          headline: formHeadline.trim() || null,
          comment: formComment.trim(),
          photoUrl: formPhotoUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFormSuccess(true);
        // Prepend new review
        setReviews((prev) => [data.review, ...prev]);

        // Recalculate summary metrics
        setSummary((prev) => {
          const newTotal = prev.totalReviews + 1;
          const newVerified = data.review.is_verified_buyer
            ? prev.verifiedBuyersCount + 1
            : prev.verifiedBuyersCount;
          const currentSum = prev.averageRating * prev.totalReviews;
          const newAvg = Number(((currentSum + formRating) / newTotal).toFixed(1));

          return {
            ...prev,
            totalReviews: newTotal,
            averageRating: newAvg,
            verifiedBuyersCount: newVerified,
          };
        });

        setTimeout(() => {
          setShowReviewModal(false);
          setFormSuccess(false);
          setFormName("");
          setFormEmail("");
          setFormHeadline("");
          setFormComment("");
          setFormPhotoUrl("");
        }, 1800);
      } else {
        setFormError(data.error || "Failed to submit review. Please try again.");
      }
    } catch (err) {
      console.error("Failed submitting review:", err);
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    if (activeFilter === "photos") return Boolean(r.photo_url);
    if (activeFilter === "verified") return r.is_verified_buyer;
    if (activeFilter === "5star") return r.rating === 5;
    return true;
  });

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Exceptional / Top Quality!",
  };

  return (
    <div id="customer-reviews-section" className="border-t border-slate-200 pt-10 mt-12 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Verified Customer Feedback
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Customer Reviews & Ratings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real experiences from verified shoppers across Nigeria
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowReviewModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <MessageSquare className="w-4 h-4" /> Write a Review
        </button>
      </div>

      {/* Ratings & Breakdown Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80">
        {/* Left: Overall Score */}
        <div className="md:col-span-4 flex flex-col justify-center items-center text-center md:border-r md:border-slate-200 md:pr-6">
          <div className="text-5xl font-black text-slate-900 tracking-tight">
            {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : "5.0"}
          </div>
          <div className="flex items-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= Math.round(summary.averageRating || 5)
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-300"
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-700">
            Based on {summary.totalReviews} customer {summary.totalReviews === 1 ? "review" : "reviews"}
          </p>
          {summary.verifiedBuyersCount > 0 && (
            <div className="inline-flex items-center gap-1 mt-2 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <CheckCircle2 className="w-3 h-3" />
              {Math.round((summary.verifiedBuyersCount / summary.totalReviews) * 100)}% Verified Buyers
            </div>
          )}
        </div>

        {/* Right: Star Distribution Bars */}
        <div className="md:col-span-8 flex flex-col justify-center space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const row =
              summary.ratingDistribution[star as keyof typeof summary.ratingDistribution] || {
                count: 0,
                percentage: 0,
              };

            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 w-12 text-slate-600 font-semibold shrink-0">
                  <span>{star}</span>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${row.percentage}%` }}
                  />
                </div>
                <div className="w-12 text-right text-slate-500 text-[11px] font-medium shrink-0">
                  {row.count} ({row.percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            All ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("photos")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeFilter === "photos"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Camera className="w-3 h-3" /> With Photos ({reviews.filter((r) => r.photo_url).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("verified")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeFilter === "verified"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Buyers ({reviews.filter((r) => r.is_verified_buyer).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("5star")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeFilter === "5star"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> 5 Stars Only
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </span>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500">No reviews found matching the selected filter.</p>
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className="text-xs font-bold text-pink-600 hover:underline"
          >
            View all reviews
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const hasVoted = Boolean(votedMap[review.id]);

            return (
              <div
                key={review.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 transition-shadow hover:shadow-xs"
              >
                {/* Review Header: User & Rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                      {review.customer_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{review.customer_name}</span>
                        {review.is_verified_buyer && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Buyer
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= review.rating
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(review.created_at).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Helpful Button */}
                  <button
                    type="button"
                    onClick={() => handleHelpfulVote(review.id)}
                    disabled={hasVoted}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      hasVoted
                        ? "bg-slate-100 text-emerald-700 font-bold"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    title="Was this review helpful?"
                  >
                    <ThumbsUp className={`w-3 h-3 ${hasVoted ? "text-emerald-600 fill-emerald-600" : ""}`} />
                    <span>{review.helpful_votes}</span>
                  </button>
                </div>

                {/* Review Headline & Body */}
                <div className="space-y-1">
                  {review.headline && (
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{review.headline}</h4>
                  )}
                  <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
                </div>

                {/* Customer Photo UGC */}
                {review.photo_url && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setActivePhotoModal(review.photo_url)}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 inline-block focus:outline-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={review.photo_url}
                        alt="Customer photo review"
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        Zoom 🔍
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Write a Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-pink-500 text-pink-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Review {productName}</h3>
                  <p className="text-[11px] text-slate-500">Share your genuine shopping feedback</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Thank you! Your review has been published.</span>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              {/* Star Rating Picker */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setFormRating(star)}
                      className="p-1 focus:outline-hidden transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= (hoverRating || formRating)
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-slate-800 text-xs">
                    {ratingLabels[hoverRating || formRating]}
                  </span>
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Funke Akindele"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. funke@example.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/50 text-[11px] text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Tip: If you use the same email from your completed order, a <strong>Verified Buyer</strong> badge will be automatically awarded to your review!
                </span>
              </div>

              {/* Review Headline */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Review Headline (Optional)
                </label>
                <input
                  type="text"
                  value={formHeadline}
                  onChange={(e) => setFormHeadline(e.target.value)}
                  placeholder="e.g. Amazing craftsmanship! Arrived within 24 hours"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Detailed Feedback *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="How was the product quality, packaging, and delivery experience?"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              {/* Photo URL */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Photo URL (Optional UGC Image)
                </label>
                <div className="relative">
                  <Camera className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    placeholder="https://... (direct link to image of product received)"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 font-bold text-white transition-colors shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 fill-white" /> Submit Review
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Zoom Lightbox Modal */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActivePhotoModal(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden bg-black shadow-2xl">
            <button
              type="button"
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhotoModal}
              alt="Enlarged customer photo review"
              className="w-full h-full object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
