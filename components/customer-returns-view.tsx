"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  RefreshCcw,
  CheckCircle,
  Truck,
  Package,
  AlertCircle,
  Clock,
  Sparkles,
  Copy,
  Check,
  X,
  Plus,
  Trash2,
  CornerDownLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { formatKoboToNaira } from "@/lib/utils";

export interface CustomerReturnItem {
  id: string;
  order_item_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price_kobo: number;
  qty: number;
  item_refund_kobo: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    image_urls: string[];
  };
}

export interface CustomerReturnRequest {
  id: string;
  rma_number: string;
  order_id: string;
  customer_id: string;
  status: "requested" | "approved" | "rejected" | "in_transit" | "received" | "refunded" | "cancelled";
  reason: "damaged_defective" | "wrong_item_delivered" | "quality_not_as_expected" | "size_fit_issue" | "changed_mind" | "other";
  customer_note: string | null;
  evidence_images: string[];
  refund_method: "original_payment" | "store_credit";
  pickup_address: string | null;
  return_courier: string | null;
  return_tracking_num: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  refund_amount_kobo: number;
  refund_reference: string | null;
  restocked: boolean;
  approved_at: string | null;
  in_transit_at: string | null;
  received_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  order: {
    id: string;
    order_number: number;
    total_kobo: number;
    status: string;
    delivered_at: string | null;
  };
  items: CustomerReturnItem[];
}

interface CustomerReturnsViewProps {
  returns: CustomerReturnRequest[];
  onRefresh: () => Promise<void>;
  onStartReturn?: () => void;
}

export default function CustomerReturnsView({
  returns,
  onRefresh,
  onStartReturn,
}: CustomerReturnsViewProps) {
  const [expandedRmaId, setExpandedRmaId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const reasonLabels: Record<string, string> = {
    damaged_defective: "Damaged / Defective Item",
    wrong_item_delivered: "Wrong Item Delivered",
    quality_not_as_expected: "Quality Not as Expected",
    size_fit_issue: "Size / Fit Issue",
    changed_mind: "Changed My Mind",
    other: "Other Reason",
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCancelRequest = async (rmaId: string) => {
    if (!confirm("Are you sure you want to cancel this return request?")) return;
    setCancellingId(rmaId);
    try {
      const res = await fetch(`/api/customer/returns/${rmaId}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to cancel return request:", err);
    } finally {
      setCancellingId(null);
    }
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "requested":
        return 1;
      case "approved":
        return 2;
      case "in_transit":
        return 3;
      case "received":
        return 4;
      case "refunded":
        return 5;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Returns Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">
              Returns & Refund Requests ({returns.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track return pickups, warehouse inspection status, and Paystack/store credit refunds.
          </p>
        </div>

        {onStartReturn && (
          <button
            type="button"
            onClick={onStartReturn}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <CornerDownLeft className="w-3.5 h-3.5" /> Return an Order
          </button>
        )}
      </div>

      {returns.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <RefreshCcw className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">No Return Requests</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You have not submitted any return or refund requests. Delivered items eligible for return can be initiated directly from your &ldquo;My Orders&rdquo; tab.
          </p>
          {onStartReturn && (
            <button
              type="button"
              onClick={onStartReturn}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              View My Orders
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((rma) => {
            const step = getStepIndex(rma.status);
            const isTerminal = rma.status === "rejected" || rma.status === "cancelled";
            const isExpanded = expandedRmaId === rma.id;

            return (
              <div
                key={rma.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* RMA Card Top Header */}
                <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-black text-sm text-slate-900">
                      {rma.rma_number}
                    </span>
                    <span className="font-semibold text-slate-500">
                      Order #{rma.order.order_number}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border ${
                        rma.status === "requested"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : rma.status === "approved"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : rma.status === "in_transit"
                          ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                          : rma.status === "received"
                          ? "bg-purple-100 text-purple-800 border-purple-300"
                          : rma.status === "refunded"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : rma.status === "rejected"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      {rma.status.replace("_", " ")}
                    </span>
                    <span className="text-slate-400">
                      Submitted on{" "}
                      {new Date(rma.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Refund Total</span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        {formatKoboToNaira(rma.refund_amount_kobo)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedRmaId(isExpanded ? null : rma.id)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title={isExpanded ? "Collapse details" : "Expand details"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Return Lifecycle Progress Stepper */}
                {!isTerminal ? (
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
                    <div className="grid grid-cols-5 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs">
                      {[
                        { num: 1, label: "Requested", icon: Clock },
                        { num: 2, label: "Approved", icon: CheckCircle },
                        { num: 3, label: "In Transit", icon: Truck },
                        { num: 4, label: "Inspected", icon: Package },
                        { num: 5, label: "Refunded", icon: Sparkles },
                      ].map((s) => {
                        const Icon = s.icon;
                        const isDone = step >= s.num;
                        const isCurrent = step === s.num;
                        return (
                          <div key={s.num} className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold mb-1.5 transition-all ${
                                isDone
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-400"
                              } ${isCurrent ? "ring-2 ring-purple-400 ring-offset-2" : ""}`}
                            >
                              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <span
                              className={`font-semibold truncate max-w-full ${
                                isDone ? "text-purple-900" : "text-slate-400"
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-700">
                      {rma.status === "rejected"
                        ? `Return Declined: ${rma.rejection_reason || "Item not eligible under policy."}`
                        : "This return request was cancelled by you."}
                    </span>
                  </div>
                )}

                {/* Store Credit Issued Banner */}
                {rma.status === "refunded" && rma.refund_method === "store_credit" && rma.refund_reference && (
                  <div className="p-4 bg-purple-50 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-900">
                    <div>
                      <span className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" /> Store Credit Coupon Ready
                      </span>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        Use this code at checkout for 100% deduction of {formatKoboToNaira(rma.refund_amount_kobo)}.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm bg-white px-3 py-1.5 rounded-xl border border-purple-300 text-purple-900">
                        {rma.refund_reference}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(rma.refund_reference!)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        {copiedCode === rma.refund_reference ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-slate-50/50 space-y-4 text-xs border-b border-slate-100 animate-in fade-in duration-150">
                    {/* Reason & Evidence */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                          Return Reason
                        </div>
                        <div className="text-slate-800 font-semibold">
                          {reasonLabels[rma.reason] || rma.reason}
                        </div>
                        {rma.customer_note && (
                          <div className="text-slate-600 italic text-[11px] pt-1">
                            &ldquo;{rma.customer_note}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                          Resolution & Logistics
                        </div>
                        <div className="text-slate-700">
                          Method:{" "}
                          <span className="font-bold">
                            {rma.refund_method === "store_credit" ? "Store Credit Voucher" : "Paystack Card Refund"}
                          </span>
                        </div>
                        {rma.return_courier && (
                          <div className="text-slate-700">
                            Courier: <span className="font-semibold">{rma.return_courier}</span>{" "}
                            {rma.return_tracking_num && (
                              <span className="font-mono text-[11px]">({rma.return_tracking_num})</span>
                            )}
                          </div>
                        )}
                        {rma.pickup_address && (
                          <div className="text-slate-500 text-[11px] truncate">
                            Pickup: {rma.pickup_address}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Evidence Images */}
                    {rma.evidence_images && rma.evidence_images.length > 0 && (
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                          Evidence Photos
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {rma.evidence_images.map((img, idx) => (
                            <a
                              key={idx}
                              href={img}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={img}
                                alt="Return evidence"
                                className="w-14 h-14 rounded-xl object-cover border border-slate-200 hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {rma.admin_notes && (
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                          Aura Support Update
                        </div>
                        <p className="text-slate-700 text-xs">{rma.admin_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Return Items List */}
                <div className="p-4 sm:p-5 divide-y divide-slate-100">
                  {rma.items.map((item) => (
                    <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        {item.product?.image_urls && item.product.image_urls[0] ? (
                          <img
                            src={item.product.image_urls[0]}
                            alt={item.product_name_snapshot}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">
                            {item.product_name_snapshot}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Returning {item.qty} unit(s) &times; {formatKoboToNaira(item.unit_price_kobo)}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono font-bold text-slate-900">
                        {formatKoboToNaira(item.item_refund_kobo)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cancel Request Action Footer */}
                {rma.status === "requested" && (
                  <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Aura Support will review your request within 24 hours.
                    </span>
                    <button
                      type="button"
                      disabled={cancellingId === rma.id}
                      onClick={() => handleCancelRequest(rma.id)}
                      className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      {cancellingId === rma.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      Cancel Return Request
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
