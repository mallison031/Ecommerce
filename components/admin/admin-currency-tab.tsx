"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Save,
  Info,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface CurrencyConfig {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate_to_ngn: number;
  is_active: boolean;
  updated_at: string;
}

export function AdminCurrencyTab() {
  const [currencies, setCurrencies] = useState<CurrencyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/currency-settings");
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrencies(data.currencies || []);
        const initialMap: Record<string, string> = {};
        for (const c of data.currencies || []) {
          initialMap[c.code] = c.exchange_rate_to_ngn.toString();
        }
        setEditingRates(initialMap);
      }
    } catch (err) {
      console.error("Error fetching currencies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleUpdateRate = async (code: string) => {
    const rawRate = editingRates[code];
    const rateNum = parseFloat(rawRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      setMessage({ type: "error", text: "Please enter a valid positive exchange rate." });
      return;
    }

    setSavingCode(code);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/currency-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          exchange_rate_to_ngn: rateNum,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: `${code} exchange rate updated to ₦${rateNum.toLocaleString()}` });
        fetchCurrencies();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update currency." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error saving currency rate." });
    } finally {
      setSavingCode(null);
    }
  };

  const handleToggleActive = async (code: string, currentActive: boolean) => {
    setSavingCode(code);
    try {
      const res = await fetch("/api/admin/currency-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          is_active: !currentActive,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: `${code} has been ${!currentActive ? "activated" : "deactivated"}`,
        });
        fetchCurrencies();
      }
    } catch (err) {
      console.error("Error toggling currency:", err);
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Globe className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Multi-Currency & Foreign Exchange (FX) Engine
            </h2>
            <p className="text-xs text-slate-500">
              Manage live conversion rates against base Naira (NGN) and international shopper currency display.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchCurrencies}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Info notice */}
      <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Base Currency Architecture: Nigerian Naira (NGN)</p>
          <p className="text-blue-700 text-[11px] leading-relaxed">
            All database balances, product ledger records, and accounting invoices remain locked to Naira.
            When an international shopper browses in USD, GBP, or EUR, item prices and cart subtotals convert dynamically using the exchange rates configured below.
          </p>
        </div>
      </div>

      {/* Currencies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {currencies.map((curr) => {
          const isBase = curr.code === "NGN";
          const samplePriceKobo = 2500000; // ₦25,000
          const currentRate = parseFloat(editingRates[curr.code] || curr.exchange_rate_to_ngn.toString());
          const convertedSample = isBase
            ? "₦25,000"
            : currentRate > 0
            ? `${curr.symbol}${(25000 / currentRate).toFixed(2)}`
            : "—";

          return (
            <div
              key={curr.code}
              className={`bg-white p-5 rounded-2xl border shadow-xs space-y-4 flex flex-col justify-between ${
                curr.is_active ? "border-slate-200/80" : "border-slate-200/40 opacity-60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-800 font-mono">
                      {curr.symbol}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{curr.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">{curr.code}</span>
                    </div>
                  </div>

                  {!isBase && (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(curr.code, curr.is_active)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        curr.is_active
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {curr.is_active ? "Active" : "Disabled"}
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    {isBase ? "Base Unit Ratio" : `1 ${curr.code} in NGN (₦)`}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="any"
                      disabled={isBase}
                      value={editingRates[curr.code] || ""}
                      onChange={(e) =>
                        setEditingRates({
                          ...editingRates,
                          [curr.code]: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-pink-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {!isBase && (
                      <button
                        type="button"
                        disabled={savingCode === curr.code}
                        onClick={() => handleUpdateRate(curr.code)}
                        className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shrink-0 shadow-2xs"
                        title="Save Rate"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] text-slate-400">Sample ₦25,000 Product Preview:</span>
                  <div className="text-xs font-bold text-slate-800">{convertedSample}</div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                Last updated: {new Date(curr.updated_at).toLocaleDateString("en-NG")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
