"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, Check, Loader2, Tag, PackageCheck, X } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface ProductWatchlistButtonProps {
  productId: string;
  productName: string;
  currentPriceKobo: number;
  stockQty: number;
}

export function ProductWatchlistButton({
  productId,
  productName,
  currentPriceKobo,
  stockQty,
}: ProductWatchlistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyPriceDrop, setNotifyPriceDrop] = useState(true);
  const [notifyRestock, setNotifyRestock] = useState(stockQty <= 0);
  const [targetPrice, setTargetPrice] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/products/${productId}/watchlist`);
        const data = await res.json();
        if (data.success && data.is_watching) {
          setIsWatching(true);
          if (data.watchlist?.email) setEmail(data.watchlist.email);
        }
      } catch (err) {
        // quiet fallback
      } finally {
        setChecking(false);
      }
    }
    checkStatus();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const targetKobo = targetPrice ? Math.round(parseFloat(targetPrice) * 100) : undefined;

      const res = await fetch(`/api/products/${productId}/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: phone || undefined,
          notify_price_drop: notifyPriceDrop,
          notify_restock: notifyRestock,
          target_price_kobo: targetKobo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsWatching(true);
        setStatusMsg({
          type: "success",
          text: "Alert saved! We will notify you when price drops or stock changes.",
        });
        setTimeout(() => {
          setIsOpen(false);
          setStatusMsg(null);
        }, 2200);
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to set alert." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition shadow-sm border ${
          isWatching
            ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        }`}
        title="Get notified when this item is on sale or back in stock"
      >
        {isWatching ? (
          <>
            <BellRing className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Alerts Active</span>
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            <span>{stockQty <= 0 ? "Notify When Restocked" : "Track Price / Alert"}</span>
          </>
        )}
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Set Product Alerts</h3>
                <p className="text-xs text-slate-500 truncate max-w-[280px]">
                  {productName}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-600 flex justify-between items-center border border-slate-100">
              <span>Current Price:</span>
              <span className="font-bold text-slate-900 font-mono">
                {formatNaira(currentPriceKobo)}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. shopper@example.com"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyPriceDrop}
                    onChange={(e) => setNotifyPriceDrop(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Notify me on any Price Drop / Flash Sale</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyRestock}
                    onChange={(e) => setNotifyRestock(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Notify me when Back in Stock</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Price in Naira (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder={`e.g. ${Math.round((currentPriceKobo * 0.9) / 100)}`}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Leave blank to be alerted of any discount or promotion.
                </p>
              </div>

              {statusMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    statusMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {statusMsg.type === "success" ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (!notifyPriceDrop && !notifyRestock)}
                  className="flex-1 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isWatching ? "Update Alert" : "Activate Alert"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
