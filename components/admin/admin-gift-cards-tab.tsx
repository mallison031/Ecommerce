"use client";

import { useEffect, useState } from "react";
import { Gift, Plus, Copy, Check, AlertCircle, RefreshCw, CreditCard, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { formatKoboToNaira } from "@/lib/utils";

interface GiftCardItem {
  id: string;
  code: string;
  initial_value_kobo: number;
  balance_kobo: number;
  recipient_name?: string;
  recipient_email?: string;
  sender_name?: string;
  message?: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  redemptions: Array<{
    id: string;
    amount_kobo: number;
    redeemed_at: string;
    order_number: number;
    customer_name: string;
  }>;
}

interface Stats {
  total_cards: number;
  total_issued_kobo: number;
  outstanding_liability_kobo: number;
  total_redeemed_kobo: number;
}

export function AdminGiftCardsTab() {
  const [cards, setCards] = useState<GiftCardItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form states
  const [amountNaira, setAmountNaira] = useState(10000);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [message, setMessage] = useState("");
  const [expiryDays, setExpiryDays] = useState(180);

  const fetchGiftCards = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/gift-cards");
      const data = await res.json();
      if (data.success) {
        setCards(data.gift_cards || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to load gift cards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiftCards();
  }, []);

  const handleIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountNaira < 100) return setError("Minimum amount is ₦100");

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_kobo: Math.round(amountNaira * 100),
          code: customCode.trim() || undefined,
          recipient_name: recipientName.trim() || undefined,
          recipient_email: recipientEmail.trim() || undefined,
          message: message.trim() || undefined,
          expires_in_days: Number(expiryDays),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to issue gift card");
      } else {
        setShowIssueModal(false);
        setCustomCode("");
        setRecipientName("");
        setRecipientEmail("");
        setMessage("");
        fetchGiftCards();
      }
    } catch (err) {
      setError("An unexpected error occurred while issuing gift card");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch("/api/admin/gift-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      fetchGiftCards();
    } catch (err) {
      console.error("Failed to toggle gift card:", err);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-indigo-600" />
            Gift Cards & Store Credit Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Issue digital vouchers, track remaining balances, and manage customer wallet credits.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchGiftCards}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setShowIssueModal(true);
              setError(null);
            }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Issue Gift Card
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cards</span>
              <p className="text-2xl font-black text-slate-900">{stats.total_cards}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Issued Value</span>
              <p className="text-xl font-black text-slate-900">{formatKoboToNaira(stats.total_issued_kobo)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Balance</span>
              <p className="text-xl font-black text-amber-700">{formatKoboToNaira(stats.outstanding_liability_kobo)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Redeemed</span>
              <p className="text-xl font-black text-emerald-700">{formatKoboToNaira(stats.total_redeemed_kobo)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gift Cards Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Issued Gift Cards & Store Credit</h3>
          <span className="text-xs text-slate-500">{cards.length} cards</span>
        </div>

        {loading && cards.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            Loading gift cards...
          </div>
        ) : cards.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6" />
            </div>
            <p className="text-slate-800 font-semibold text-sm">No gift cards issued yet</p>
            <p className="text-slate-500 text-xs mt-1">Issue digital gift cards to provide store credit or customer compensation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Card Code</th>
                  <th className="py-3 px-4">Recipient / Owner</th>
                  <th className="py-3 px-4">Balance / Initial</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cards.map((gc) => (
                  <tr key={gc.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-mono font-bold text-indigo-600 bg-indigo-50/70 px-2 py-1 rounded w-fit">
                        <span>{gc.code}</span>
                        <button
                          onClick={() => copyToClipboard(gc.code)}
                          className="text-slate-400 hover:text-indigo-600 transition"
                          title="Copy Code"
                        >
                          {copiedCode === gc.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {gc.message && (
                        <p className="text-[11px] text-slate-400 italic mt-1 max-w-xs truncate">
                          &quot;{gc.message}&quot;
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {gc.recipient_name ? (
                        <div>
                          <span className="font-semibold text-slate-900 block">{gc.recipient_name}</span>
                          <span className="text-slate-400 text-[11px]">{gc.recipient_email || "No email"}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned (Bearer)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatKoboToNaira(gc.balance_kobo)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        of {formatKoboToNaira(gc.initial_value_kobo)} initial
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          !gc.is_active
                            ? "bg-rose-100 text-rose-700"
                            : gc.balance_kobo <= 0
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {!gc.is_active ? "Deactivated" : gc.balance_kobo <= 0 ? "Depleted" : "Active"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {gc.expires_at ? new Date(gc.expires_at).toLocaleDateString("en-NG") : "Never"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(gc.id, gc.is_active)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition border ${
                          gc.is_active
                            ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {gc.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Gift Card Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-600" />
                Issue Gift Card / Store Credit
              </h3>
              <button
                onClick={() => setShowIssueModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleIssueCard} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Card Amount (NGN ₦) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={amountNaira}
                    onChange={(e) => setAmountNaira(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 text-sm font-bold border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Custom Code (Optional, leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP-REWARD-5000"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chioma Eze"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    placeholder="chioma@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Greeting / Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Thank you for being a loyal customer!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Validity Period (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {submitting ? "Issuing..." : "Issue Gift Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
