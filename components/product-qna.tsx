"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ThumbsUp, CheckCircle, Send, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Answer {
  id: string;
  answered_by: string;
  answer: string;
  is_official: boolean;
  helpful_count: number;
  created_at: string;
}

interface Question {
  id: string;
  customer_name: string;
  question: string;
  created_at: string;
  answers: Answer[];
}

export function ProductQnA({ productId, productName }: { productId: string; productName: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAskForm, setShowAskForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [votedAnswerIds, setVotedAnswerIds] = useState<string[]>([]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/questions`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Failed to load product questions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [productId]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !questionText.trim()) {
      setErrorMsg("Name and question are required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch(`/api/products/${productId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || undefined,
          question: questionText.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || "Failed to submit question.");
      } else {
        setSuccessMsg("Your question has been submitted! Our concierge team will answer shortly.");
        setQuestionText("");
        setShowAskForm(false);
        fetchQuestions();
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteHelpful = async (questionId: string, answerId: string) => {
    if (votedAnswerIds.includes(answerId)) return;

    try {
      setVotedAnswerIds((prev) => [...prev, answerId]);
      const res = await fetch(
        `/api/products/${productId}/questions/${questionId}/answers/${answerId}/helpful`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id !== questionId) return q;
            return {
              ...q,
              answers: q.answers.map((a) =>
                a.id === answerId ? { ...a, helpful_count: data.helpful_count } : a
              ),
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to vote helpful:", err);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-slate-200" id="qna-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            Questions & Answers
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Have questions about {productName}? Ask our concierge or explore answers from verified buyers.
          </p>
        </div>

        <button
          onClick={() => setShowAskForm((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition self-start sm:self-auto"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {showAskForm ? "Close Form" : "Ask a Question"}
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Ask Question Collapsible Box */}
      {showAskForm && (
        <div className="mb-8 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Ask a Question About This Product</h3>
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <form onSubmit={handleAskQuestion} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fatima Bello"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional, for notifications)</label>
                <input
                  type="email"
                  placeholder="fatima@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Question *</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Is this waterproof? How long does standard engraving take?"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAskForm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? "Submitting..." : "Post Question"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Questions list */}
      {loading && questions.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">Loading community questions...</div>
      ) : questions.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">No questions asked yet for this item</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Be the first to ask about sizing, specs, or delivery.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">Q</span>
                    <span className="text-xs font-bold text-slate-900">{q.question}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block ml-5">
                    Asked by {q.customer_name} • {new Date(q.created_at).toLocaleDateString("en-NG")}
                  </span>
                </div>
              </div>

              {/* Answers */}
              {q.answers.length > 0 ? (
                <div className="ml-5 pt-2 border-t border-slate-100 space-y-2">
                  {q.answers.map((ans) => (
                    <div key={ans.id} className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded">A</span>
                          <span className="font-semibold text-slate-800">{ans.answered_by}</span>
                          {ans.is_official && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-200">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> Verified Store Concierge
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ans.created_at).toLocaleDateString("en-NG")}
                        </span>
                      </div>

                      <p className="text-slate-700 leading-relaxed text-xs pl-5">{ans.answer}</p>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleVoteHelpful(q.id, ans.id)}
                          disabled={votedAnswerIds.includes(ans.id)}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition ${
                            votedAnswerIds.includes(ans.id)
                              ? "text-indigo-600 bg-indigo-50 font-bold"
                              : "text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>Helpful ({ans.helpful_count})</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ml-5 text-[11px] text-slate-400 italic">
                  Awaiting answer from store concierge...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
