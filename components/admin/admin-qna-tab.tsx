"use client";

import { useEffect, useState } from "react";
import { MessageSquare, CheckCircle, RefreshCw, Send, Trash2, ExternalLink, HelpCircle, Check, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Answer {
  id: string;
  answered_by: string;
  answer: string;
  is_official: boolean;
  helpful_count: number;
  created_at: string;
}

interface QuestionItem {
  id: string;
  customer_name: string;
  customer_email?: string;
  question: string;
  is_approved: boolean;
  created_at: string;
  product: {
    id: string;
    name: string;
    slug: string;
    sector_slug: string;
    sector_name: string;
  };
  answers: Answer[];
}

export function AdminQnATab() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [filter, setFilter] = useState<"all" | "unanswered" | "answered">("all");

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/questions");
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handlePostAnswer = async (questionId: string) => {
    if (!replyText.trim()) return;

    try {
      setSubmittingReply(true);
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          answer: replyText.trim(),
          answered_by: "Aura Concierge",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyText("");
        setAnsweringId(null);
        fetchQuestions();
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await fetch(`/api/admin/questions?id=${id}`, { method: "DELETE" });
      fetchQuestions();
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  };

  const filtered = questions.filter((q) => {
    if (filter === "unanswered") return q.answers.length === 0;
    if (filter === "answered") return q.answers.length > 0;
    return true;
  });

  const unansweredCount = questions.filter((q) => q.answers.length === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            Product Community Q&A & Answer Desk
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Answer customer pre-purchase inquiries, clarify specifications, and build social proof on product pages.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchQuestions}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Questions ({questions.length})
        </button>
        <button
          onClick={() => setFilter("unanswered")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            filter === "unanswered"
              ? "bg-amber-600 text-white"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
        >
          <span>Pending Answers</span>
          {unansweredCount > 0 && (
            <span className="bg-white/90 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              {unansweredCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("answered")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === "answered"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Answered ({questions.length - unansweredCount})
        </button>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {loading && questions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            Loading customer questions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No questions found</p>
            <p className="text-xs text-slate-500 mt-1">There are no questions matching this filter.</p>
          </div>
        ) : (
          filtered.map((q) => (
            <div
              key={q.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {q.customer_name}
                    </span>
                    {q.customer_email && (
                      <span className="text-[11px] text-slate-400">({q.customer_email})</span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      • {new Date(q.created_at).toLocaleString("en-NG")}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 pt-1">&quot;{q.question}&quot;</p>

                  <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="text-slate-500">Product:</span>
                    <Link
                      href={`/${q.product.sector_slug}/${q.product.slug}`}
                      target="_blank"
                      className="text-indigo-600 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      {q.product.name}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (answeringId === q.id) {
                        setAnsweringId(null);
                      } else {
                        setAnsweringId(q.id);
                        setReplyText("");
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
                  >
                    {answeringId === q.id ? "Cancel Reply" : "Reply / Answer"}
                  </button>
                </div>
              </div>

              {/* Answers list */}
              {q.answers.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Published Answers ({q.answers.length})
                  </span>
                  {q.answers.map((ans) => (
                    <div
                      key={ans.id}
                      className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{ans.answered_by}</span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-200">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> Official
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ans.created_at).toLocaleDateString("en-NG")} • 👍 {ans.helpful_count} helpful
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{ans.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Reply Form */}
              {answeringId === q.id && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Write Official Store Concierge Response:
                  </label>
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Provide clear, courteous details regarding sizing, care, or delivery..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-600"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAnsweringId(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingReply || !replyText.trim()}
                      onClick={() => handlePostAnswer(q.id)}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingReply ? "Posting..." : "Publish Answer"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
