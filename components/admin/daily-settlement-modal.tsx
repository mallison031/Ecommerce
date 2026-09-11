"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Download,
  DollarSign,
  TrendingUp,
  Percent,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";

interface DailySettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettlementData {
  success: boolean;
  settlementDate: string;
  metrics: {
    orderCount: number;
    refundCount: number;
    grossVolumeKobo: number;
    itemsSubtotalKobo: number;
    deliveryFeesKobo: number;
    totalGatewayFeesKobo: number;
    totalRefundsKobo: number;
    netSettlementPayoutKobo: number;
    grossVolumeFormatted: string;
    feesFormatted: string;
    refundsFormatted: string;
    netPayoutFormatted: string;
  };
  transactions: Array<{
    id: string;
    orderNumber: number;
    reference: string;
    createdAt: string;
    customerName: string;
    customerEmail: string;
    subtotalKobo: number;
    deliveryKobo: number;
    grossTotalKobo: number;
    paystackFeeKobo: number;
    netPayoutKobo: number;
    status: string;
  }>;
  refunds: Array<{
    id: string;
    orderId: string;
    orderNumber: number;
    customerName: string;
    refundAmountKobo: number;
    refundMethod: string;
    processedAt: string;
  }>;
}

export function DailySettlementModal({ isOpen, onClose }: DailySettlementModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<SettlementData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettlement = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/settlement?date=${date}&format=json`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        setError(json.error || "Failed to load settlement data");
      }
    } catch (err: any) {
      setError("Network error fetching settlement report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettlement(selectedDate);
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const handleExportCsv = () => {
    window.open(`/api/admin/settlement?date=${selectedDate}&format=csv`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Paystack Daily Settlement Reconciliation
              </h2>
              <p className="text-xs text-slate-500">
                Automated gateway charge deductions (1.5% + ₦100, max ₦2,000) and net payout audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-medium text-slate-600">Settlement Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:border-slate-900 font-medium"
            />
            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Reset to Today
              </button>
            )}
          </div>

          <button
            onClick={() => fetchSettlement(selectedDate)}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="text-xs">Reconciling Paystack transactions and refund adjustments...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Metric Highlights Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Gross Volume</span>
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    {data.metrics.grossVolumeFormatted}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {data.metrics.orderCount} transaction{data.metrics.orderCount === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
                    <span>Paystack Fees</span>
                    <Percent className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-xl font-black text-amber-900">
                    - {data.metrics.feesFormatted}
                  </div>
                  <div className="text-[10px] text-amber-700/80 mt-1">
                    1.5% + ₦100 (cap ₦2,000)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="flex items-center justify-between text-xs text-rose-700 mb-1">
                    <span>Refunds Deducted</span>
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="text-xl font-black text-rose-900">
                    - {data.metrics.refundsFormatted}
                  </div>
                  <div className="text-[10px] text-rose-700/80 mt-1">
                    {data.metrics.refundCount} processed refund{data.metrics.refundCount === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
                    <span>Net Expected Payout</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-emerald-900">
                    {data.metrics.netPayoutFormatted}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-1">
                    Direct into Zenith/GTBank
                  </div>
                </div>
              </div>

              {/* Transactions Breakdown Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Settlement Transaction Audit Trail ({data.transactions.length})
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Order #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Paystack Ref</th>
                        <th className="p-3 text-right">Gross Total</th>
                        <th className="p-3 text-right">Fee (1.5% + ₦100)</th>
                        <th className="p-3 text-right">Net Settlement</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {data.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No paid transactions recorded on this date.
                          </td>
                        </tr>
                      ) : (
                        data.transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/60">
                            <td className="p-3 font-bold text-slate-900">#{t.orderNumber}</td>
                            <td className="p-3">
                              <div className="font-medium text-slate-800">{t.customerName}</div>
                              <div className="text-[10px] text-slate-400">{t.customerEmail}</div>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-500">
                              {t.reference}
                            </td>
                            <td className="p-3 text-right font-semibold text-slate-900">
                              ₦{(t.grossTotalKobo / 100).toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-amber-700 font-mono">
                              -₦{(t.paystackFeeKobo / 100).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-700">
                              ₦{(t.netPayoutKobo / 100).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-800">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refunds Table if any */}
              {data.refunds.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600">
                    Processed Return Reversals ({data.refunds.length})
                  </h3>
                  <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/20">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-50 text-rose-800 font-semibold border-b border-rose-200">
                        <tr>
                          <th className="p-3">Order #</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Refund Method</th>
                          <th className="p-3 text-right">Deducted Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 text-slate-700">
                        {data.refunds.map((r) => (
                          <tr key={r.id}>
                            <td className="p-3 font-bold text-slate-900">#{r.orderNumber}</td>
                            <td className="p-3">{r.customerName}</td>
                            <td className="p-3 font-mono text-[10px]">
                              {r.refundMethod.replace(/_/g, " ")}
                            </td>
                            <td className="p-3 text-right font-bold text-rose-700">
                              -₦{(r.refundAmountKobo / 100).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Format compatible with QuickBooks, Xero, and Microsoft Excel</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default DailySettlementModal;
