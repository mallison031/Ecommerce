"use client";

import React, { useState, useEffect } from "react";
import {
  HeartHandshake,
  Star,
  Truck,
  Package,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ThumbsUp,
  Meh,
  ThumbsDown,
} from "lucide-react";

interface FeedbackItem {
  id: string;
  order_number: number;
  courier_name?: string | null;
  customer_name: string;
  customer_email?: string | null;
  nps_score: number | null;
  category: "Promoter" | "Passive" | "Detractor" | "Pending";
  delivery_speed_rating: number | null;
  packaging_rating: number | null;
  product_quality_rating: number | null;
  feedback_tags: string[];
  comments?: string | null;
  status: string;
  submitted_at?: string | null;
  created_at: string;
}

interface FeedbackMetrics {
  total_responses: number;
  nps_score: number;
  promoters_count: number;
  promoters_pct: number;
  passives_count: number;
  passives_pct: number;
  detractors_count: number;
  detractors_pct: number;
  avg_delivery_speed: number;
  avg_packaging: number;
  avg_product_quality: number;
}

export function AdminFeedbackTab() {
  const [metrics, setMetrics] = useState<FeedbackMetrics | null>(null);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("completed");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const queryParam = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/feedback${queryParam}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMetrics(data.metrics);
        setPopularTags(data.popular_tags || []);
        setFeedbacks(data.feedbacks || []);
      }
    } catch (err) {
      console.error("Error fetching feedback analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [statusFilter]);

  const filteredFeedbacks = feedbacks.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      f.order_number.toString().includes(q) ||
      f.customer_name.toLowerCase().includes(q) ||
      (f.customer_email && f.customer_email.toLowerCase().includes(q)) ||
      (f.comments && f.comments.toLowerCase().includes(q)) ||
      (f.courier_name && f.courier_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-pink-50 text-pink-600">
              <HeartHandshake className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Customer Satisfaction (CSAT) & Net Promoter Score
              </h2>
              <p className="text-xs text-slate-500">
                Voice of Customer (VoC) analytics on delivery speed, parcel packaging, and overall fulfillment.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchFeedback}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* KPI Hero Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Promoter Score */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Net Promoter Score</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  metrics.nps_score >= 50
                    ? "bg-emerald-50 text-emerald-700"
                    : metrics.nps_score >= 0
                    ? "bg-amber-50 text-amber-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {metrics.nps_score >= 50 ? "World Class" : metrics.nps_score >= 0 ? "Healthy" : "Needs Action"}
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {metrics.nps_score > 0 ? `+${metrics.nps_score}` : metrics.nps_score}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Based on {metrics.total_responses} responses</span>
            </div>
          </div>

          {/* Average Delivery Speed */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Courier Delivery Speed</span>
              <Truck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-black text-slate-900 flex items-center gap-1.5">
              {metrics.avg_delivery_speed}
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 inline" />
            </div>
            <div className="text-[11px] text-slate-500">Average courier rating out of 5</div>
          </div>

          {/* Average Packaging */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Parcel Packaging Quality</span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-black text-slate-900 flex items-center gap-1.5">
              {metrics.avg_packaging}
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 inline" />
            </div>
            <div className="text-[11px] text-slate-500">Protection & unboxing experience</div>
          </div>

          {/* Average Product Quality */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Product Quality</span>
              <Sparkles className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-black text-slate-900 flex items-center gap-1.5">
              {metrics.avg_product_quality}
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 inline" />
            </div>
            <div className="text-[11px] text-slate-500">Item satisfaction as received</div>
          </div>
        </div>
      )}

      {/* NPS Distribution & Popular Sentiment Tags */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* NPS Segment Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              NPS Audience Segments
            </h3>
            <div className="space-y-3">
              {/* Promoters */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <ThumbsUp className="w-3.5 h-3.5" /> Promoters (9-10)
                  </span>
                  <span className="text-slate-900">
                    {metrics.promoters_count} ({metrics.promoters_pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${metrics.promoters_pct}%` }}
                  />
                </div>
              </div>

              {/* Passives */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <Meh className="w-3.5 h-3.5" /> Passives (7-8)
                  </span>
                  <span className="text-slate-900">
                    {metrics.passives_count} ({metrics.passives_pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${metrics.passives_pct}%` }}
                  />
                </div>
              </div>

              {/* Detractors */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <ThumbsDown className="w-3.5 h-3.5" /> Detractors (1-6)
                  </span>
                  <span className="text-slate-900">
                    {metrics.detractors_count} ({metrics.detractors_pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-rose-500 h-2 rounded-full transition-all"
                    style={{ width: `${metrics.detractors_pct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Popular Feedback Tags */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer Sentiment Tags Cloud
            </h3>
            {popularTags.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No sentiment tags submitted yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {popularTags.map(({ tag, count }) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
                  >
                    <span>{tag}</span>
                    <span className="px-1.5 py-0.2 bg-pink-100 text-pink-700 rounded-full text-[10px] font-bold">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order, customer, comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          {(["completed", "pending", ""] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                statusFilter === st
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "" ? "All" : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Recent Delivery Feedback ({filteredFeedbacks.length})
          </h3>
        </div>

        {filteredFeedbacks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No feedback entries match the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">NPS Score</th>
                  <th className="py-3 px-4">Courier Speed</th>
                  <th className="py-3 px-4">Packaging</th>
                  <th className="py-3 px-4">Quality</th>
                  <th className="py-3 px-4">Tags & Comments</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredFeedbacks.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{item.order_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{item.customer_email || "—"}</div>
                    </td>
                    <td className="py-3 px-4">
                      {typeof item.nps_score === "number" ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.category === "Promoter"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.category === "Passive"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {item.nps_score}/10 ({item.category})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.delivery_speed_rating ? (
                        <div className="flex items-center gap-1">
                          <span>{item.delivery_speed_rating}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.packaging_rating ? (
                        <div className="flex items-center gap-1">
                          <span>{item.packaging_rating}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.product_quality_rating ? (
                        <div className="flex items-center gap-1">
                          <span>{item.product_quality_rating}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {item.feedback_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {item.feedback_tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.comments ? (
                        <p className="text-[11px] text-slate-600 truncate">{item.comments}</p>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">No comment</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {item.submitted_at
                        ? new Date(item.submitted_at).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
