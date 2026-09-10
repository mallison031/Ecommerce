"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatKoboToNaira } from "@/lib/utils";
import Link from "next/link";
import {
  Search,
  Package,
  CheckCircle,
  Truck,
  Home,
  AlertCircle,
  Download,
  MessageCircle,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface TrackedOrder {
  id: string;
  order_number: number;
  status: string;
  total_kobo: number;
  created_at: string;
  paid_at: string | null;
  customer_name: string;
  customer_email_masked: string;
  customer_phone_masked: string;
  whatsapp_opt_in: boolean;
  delivery_address: string;
  courier_name: string | null;
  tracking_number: string | null;
  dispatch_notes: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price_kobo: number;
    line_total_kobo: number;
  }>;
  invoice_number: number | null;
  receipt_number: number | null;
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("order") || searchParams.get("phone") || searchParams.get("query") || "";

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleTrack = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setError(null);
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/track-order?query=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to find order.");
      }

      setOrders(data.orders || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error tracking order";
      setError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleTrack(initialQuery);
    }
  }, [initialQuery]);

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case "pending_payment":
        return 0;
      case "paid":
        return 1;
      case "shipped":
        return 2;
      case "delivered":
        return 3;
      default:
        return 1;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          <Package className="w-3.5 h-3.5" /> Order Fulfillment Tracker
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Track Your Shipment</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your Order Number (e.g. <span className="font-semibold text-slate-800">#1042</span>) or the phone number provided at checkout.
        </p>

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack(query);
          }}
          className="mt-6 flex items-center gap-2 max-w-md mx-auto"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 1042 or 08012345678"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
          </button>
        </form>
      </div>

      {/* Error Card */}
      {error && (
        <div className="max-w-md mx-auto p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">No match found</span>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {orders.length > 0 && (
        <div className="space-y-8">
          {orders.map((order) => {
            const step = getStatusStepIndex(order.status);
            const isSpecialState = ["returned", "abandoned", "cancelled", "refunded"].includes(order.status);

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xs">
                {/* Order Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Order Reference</span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">#{order.order_number}</h2>
                    <span className="text-xs text-slate-500">
                      Placed on {new Date(order.created_at).toLocaleDateString("en-NG", { dateStyle: "long" })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {order.status === "paid" || order.status === "shipped" || order.status === "delivered" ? (
                      <a
                        href={`/api/orders/${order.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Receipt
                      </a>
                    ) : null}

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.status === "paid"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : order.status === "shipped"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : order.status === "delivered"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : order.status === "abandoned"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : order.status === "returned"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Stepper Progress Bar */}
                {!isSpecialState ? (
                  <div className="py-4">
                    <div className="grid grid-cols-4 gap-2 text-center relative">
                      {/* Connecting Line */}
                      <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-slate-200 -z-0">
                        <div
                          className="h-full bg-slate-900 transition-all duration-500"
                          style={{ width: `${(step / 3) * 100}%` }}
                        />
                      </div>

                      {/* Step 1 */}
                      <div className="flex flex-col items-center gap-2 relative z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            step >= 0 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800">Order Placed</span>
                      </div>

                      {/* Step 2 */}
                      <div className="flex flex-col items-center gap-2 relative z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            step >= 1 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800">Payment Confirmed</span>
                      </div>

                      {/* Step 3 */}
                      <div className="flex flex-col items-center gap-2 relative z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            step >= 2 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          <Truck className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800">In Transit</span>
                      </div>

                      {/* Step 4 */}
                      <div className="flex flex-col items-center gap-2 relative z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            step >= 3 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          <Home className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800">Delivered</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <span className="font-bold capitalize">{order.status} Status Notice:</span>
                    <p className="mt-1">
                      This order is currently flagged as {order.status}. If you have any inquiries or require courier assistance, please contact customer care via WhatsApp.
                    </p>
                  </div>
                )}

                {/* Dispatch / Courier Details (if dispatched) */}
                {(order.courier_name || order.tracking_number) && (
                  <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Truck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-blue-950">
                          Dispatched via {order.courier_name || "Courier Partner"}
                          {order.shipped_at && (
                            <span className="font-normal text-blue-700 text-[11px] ml-1.5">
                              • {new Date(order.shipped_at).toLocaleDateString("en-NG", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        {order.tracking_number && (
                          <div className="font-mono text-blue-800 mt-0.5">
                            Waybill / Tracking: <span className="font-bold">{order.tracking_number}</span>
                          </div>
                        )}
                        {order.dispatch_notes && (
                          <div className="text-blue-700/90 text-[11px] mt-0.5 italic">
                            Delivery note: {order.dispatch_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Delivery Information</h3>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p className="font-semibold text-slate-900">{order.customer_name}</p>
                      <p>{order.delivery_address}</p>
                      <p>Contact: {order.customer_phone_masked}</p>
                      <p>Email: {order.customer_email_masked}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Purchased Items</h3>
                    <div className="divide-y divide-slate-100 text-xs">
                      {order.items.map((item) => (
                        <div key={item.id} className="py-1.5 flex justify-between">
                          <span className="text-slate-700 truncate pr-2">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium text-slate-900 shrink-0">
                            {formatKoboToNaira(item.line_total_kobo)}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 flex justify-between font-bold text-slate-900 text-sm">
                        <span>Total Paid</span>
                        <span>{formatKoboToNaira(order.total_kobo)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Help CTA */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-emerald-900 font-medium">
                      Have questions about order #{order.order_number}?
                    </span>
                  </div>
                  <a
                    href={`https://wa.me/2348000000000?text=${encodeURIComponent(
                      `Hello Aura Support, I am inquiring about my order #${order.order_number} (status: ${order.status}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shrink-0"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State after search */}
      {searched && !loading && orders.length === 0 && !error && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No order found matching your search.</p>
          <p className="text-xs text-slate-400 mt-1">Please check your order number or phone number and try again.</p>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading tracking portal...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
