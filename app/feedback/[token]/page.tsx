"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star,
  CheckCircle,
  Truck,
  Package,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  HeartHandshake,
} from "lucide-react";
import { POPULAR_FEEDBACK_TAGS } from "@/lib/feedback/nps";

export default function DeliveryFeedbackPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyData, setSurveyData] = useState<any>(null);

  // Form State
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [deliverySpeed, setDeliverySpeed] = useState<number>(5);
  const [packaging, setPackaging] = useState<number>(5);
  const [productQuality, setProductQuality] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comments, setComments] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadSurvey() {
      try {
        const res = await fetch(`/api/feedback/${token}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Survey not found or has expired.");
        } else {
          setSurveyData(data);
          if (data.survey.status === "completed") {
            setSubmitted(true);
            setNpsScore(data.survey.nps_score);
            setDeliverySpeed(data.survey.delivery_speed_rating || 5);
            setPackaging(data.survey.packaging_rating || 5);
            setProductQuality(data.survey.product_quality_rating || 5);
            setSelectedTags(data.survey.feedback_tags || []);
            setComments(data.survey.comments || "");
          }
        }
      } catch (err) {
        setError("Network error loading feedback survey.");
      } finally {
        setLoading(false);
      }
    }
    loadSurvey();
  }, [token]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!npsScore) {
      alert("Please choose a recommendation score from 1 to 10.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nps_score: npsScore,
          delivery_speed_rating: deliverySpeed,
          packaging_rating: packaging,
          product_quality_rating: productQuality,
          feedback_tags: selectedTags,
          comments,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        alert(data.error || "Failed to submit feedback. Please try again.");
      }
    } catch (err) {
      alert("An unexpected network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading your delivery survey...</p>
      </div>
    );
  }

  if (error || !surveyData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">Survey Link Unavailable</h1>
          <p className="text-xs text-slate-400">{error || "Invalid survey token."}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold"
          >
            Return to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 py-12">
      <div className="max-w-xl w-full bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[11px] font-semibold rounded-full uppercase tracking-wider">
            <HeartHandshake className="w-3.5 h-3.5" /> Aura Delivery Experience
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            How was your delivery?
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Order <span className="font-mono text-pink-400">#{surveyData.order.order_number}</span> fulfilled via{" "}
            <span className="text-slate-200 font-medium">{surveyData.order.courier_name}</span>.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-8 space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Thank You for Your Feedback!</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your ratings help us continually enhance our courier network, delivery packaging, and service quality across Nigeria.
              </p>
            </div>
            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-xs text-slate-300 max-w-md mx-auto flex items-center justify-between">
              <span>Your Recommendation Score:</span>
              <span className="font-bold px-3 py-1 bg-pink-600/30 border border-pink-500/30 text-pink-300 rounded-lg">
                {npsScore}/10 ({npsScore && npsScore >= 9 ? "Promoter" : npsScore && npsScore >= 7 ? "Passive" : "Detractor"})
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs shadow-lg shadow-pink-600/20 transition-all"
              >
                Continue Shopping <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* NPS 1 to 10 scale */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-200">
                1. How likely are you to recommend Aura to friends or colleagues?
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                  const isSelected = npsScore === score;
                  const scoreColor =
                    score >= 9
                      ? "hover:border-emerald-500 hover:text-emerald-400"
                      : score >= 7
                      ? "hover:border-amber-500 hover:text-amber-400"
                      : "hover:border-rose-500 hover:text-rose-400";

                  const activeColor =
                    score >= 9
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                      : score >= 7
                      ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/30"
                      : "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30";

                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setNpsScore(score)}
                      className={`h-11 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? activeColor
                          : `bg-slate-800/80 border-slate-700/80 text-slate-300 ${scoreColor}`
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 px-1">
                <span>1 - Not likely</span>
                <span>10 - Extremely likely</span>
              </div>
            </div>

            {/* Star ratings breakdown */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-200">
                2. Rate specific aspects of your fulfillment
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Delivery Speed */}
                <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                    <Truck className="w-3.5 h-3.5 text-pink-400" /> Delivery Speed
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setDeliverySpeed(star)}
                        className="text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= deliverySpeed ? "fill-amber-400 text-amber-400" : "text-slate-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Packaging */}
                <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                    <Package className="w-3.5 h-3.5 text-pink-400" /> Parcel Packaging
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPackaging(star)}
                        className="text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= packaging ? "fill-amber-400 text-amber-400" : "text-slate-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Quality */}
                <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Product Quality
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setProductQuality(star)}
                        className="text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= productQuality ? "fill-amber-400 text-amber-400" : "text-slate-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Popular tags */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-200">
                3. What stood out? (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_FEEDBACK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-pink-600/30 border-pink-500 text-pink-300 font-medium"
                          : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-200">
                4. Additional comments or suggestions (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share any details about the courier arrival, packaging, or product condition..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-pink-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting || !npsScore}
                className="w-full py-3 px-6 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Feedback...
                  </>
                ) : (
                  <>Submit Delivery Experience Rating</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
