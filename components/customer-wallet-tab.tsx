"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  X,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount_kobo: number;
  balance_after_kobo: number;
  description: string;
  reference: string | null;
  created_at: string;
}

export function CustomerWalletTab() {
  const [balanceKobo, setBalanceKobo] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Redeem Gift Card Voucher state
  const [voucherCode, setVoucherCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Top Up Modal state
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("5000");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpMsg, setTopUpMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customer/wallet");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBalanceKobo(data.wallet_balance_kobo || 0);
          setTransactions(data.transactions || []);
        }
      }
    } catch (err) {
      console.error("Failed to load customer wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const handleRedeemGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    setRedeeming(true);
    setRedeemMsg(null);

    try {
      const res = await fetch("/api/customer/wallet/redeem-gift-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setRedeemMsg({ type: "success", text: data.message });
        setVoucherCode("");
        setBalanceKobo(data.new_balance_kobo);
        await loadWallet();
      } else {
        setRedeemMsg({ type: "error", text: data.error || "Failed to redeem code" });
      }
    } catch (err: any) {
      setRedeemMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setRedeeming(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNaira = parseFloat(topUpAmount);
    if (!amountNaira || amountNaira < 1000) {
      setTopUpMsg({ type: "error", text: "Minimum top up amount is ₦1,000" });
      return;
    }

    setTopUpLoading(true);
    setTopUpMsg(null);

    try {
      const amountKobo = Math.round(amountNaira * 100);
      const res = await fetch("/api/customer/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_kobo: amountKobo }),
      });

      const data = await res.json();
      if (data.success) {
        setTopUpMsg({ type: "success", text: data.message });
        setBalanceKobo(data.new_balance_kobo);
        setTimeout(() => {
          setIsTopUpOpen(false);
          setTopUpMsg(null);
        }, 1800);
        await loadWallet();
      } else {
        setTopUpMsg({ type: "error", text: data.error || "Top-up failed" });
      }
    } catch (err: any) {
      setTopUpMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setTopUpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-2">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-600" />
        <p className="text-xs">Loading wallet information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-bold uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" />
              <span>Aura Store Credit Wallet</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight font-mono">
              {formatNaira(balanceKobo)}
            </div>
            <p className="text-xs text-amber-100/90 max-w-md">
              Use your store credit to pay for orders instantly at checkout with zero transaction fees.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsTopUpOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-white text-amber-950 font-bold text-xs hover:bg-amber-50 active:scale-95 transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-amber-700" />
              <span>Top Up Wallet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Section: Redeem Voucher & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Redeem Gift Card Voucher Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Claim Gift Card or Voucher</h3>
              <p className="text-xs text-slate-500">
                Instantly deposit voucher codes into your wallet balance.
              </p>
            </div>
          </div>

          <form onSubmit={handleRedeemGiftCard} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="e.g. AURA-XXXX-YYYY"
                className="flex-1 text-xs px-3.5 py-2.5 uppercase font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={redeeming || !voucherCode.trim()}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                {redeeming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Claim</span>
                )}
              </button>
            </div>

            {redeemMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  redeemMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {redeemMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{redeemMsg.text}</span>
              </div>
            )}
          </form>
        </div>

        {/* Benefits & How It Works */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Why Shoppers Love Aura Wallet</span>
          </div>
          <ul className="space-y-2 text-[11px] text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">✓</span>
              <span><strong>1-Click Instant Checkout:</strong> Skip entering bank cards or OTPs every time you shop.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">✓</span>
              <span><strong>Split Payments:</strong> Automatically pay part with wallet credit and part with card.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">✓</span>
              <span><strong>Zero Expiry:</strong> Store credit never expires and remains safely linked to your phone number.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Wallet Activity & History</h3>
            <p className="text-xs text-slate-500">Record of top-ups, claims, and order deductions</p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
            {transactions.length} entries
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">No transactions recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {transactions.map((t) => {
              const isCredit = t.amount_kobo > 0;
              return (
                <div
                  key={t.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{t.description}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                        {t.reference && (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                            {t.reference}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold text-sm ${
                        isCredit ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {isCredit ? "+" : ""}
                      {formatNaira(t.amount_kobo)}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Bal: {formatNaira(t.balance_after_kobo)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Up Modal */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-6 relative">
            <button
              onClick={() => setIsTopUpOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Top Up Wallet</h3>
                <p className="text-xs text-slate-500">Secure online deposit via Paystack</p>
              </div>
            </div>

            <form onSubmit={handleTopUp} className="space-y-4">
              {/* Preset Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Predefined Amount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["2000", "5000", "10000", "25000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopUpAmount(preset)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition text-center ${
                        topUpAmount === preset
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      ₦{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Or Enter Amount (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full text-xs pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Minimum top-up is ₦1,000</p>
              </div>

              {topUpMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    topUpMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {topUpMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{topUpMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {topUpLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Deposit ₦{Number(topUpAmount || 0).toLocaleString()}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
