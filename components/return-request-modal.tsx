"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Package,
  CheckCircle,
  AlertCircle,
  Loader2,
  CornerDownLeft,
  Plus,
  Trash2,
  ShieldCheck,
  DollarSign,
  Sparkles,
  CreditCard,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
import { formatKoboToNaira } from "@/lib/utils";

interface OrderItem {
  id: string;
  product_name_snapshot: string;
  unit_price_kobo_snapshot: number;
  qty: number;
  line_total_kobo: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    image_urls: string[];
  } | null;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  total_kobo: number;
  delivery_address: string;
  items: OrderItem[];
  return_requests?: any[];
}

interface ReturnRequestModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdRma: any) => void;
}

export default function ReturnRequestModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: ReturnRequestModalProps) {
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; qty: number; maxQty: number }>
  >({});
  const [reason, setReason] = useState<string>("damaged_defective");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState<string>("");
  const [refundMethod, setRefundMethod] = useState<"original_payment" | "store_credit">(
    "original_payment"
  );
  const [pickupAddress, setPickupAddress] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      const initial: Record<string, { selected: boolean; qty: number; maxQty: number }> = {};
      order.items.forEach((item) => {
        // Subtract already active returns
        const alreadyReturned = (order.return_requests || [])
          .filter((r: any) => r.status !== "rejected" && r.status !== "cancelled")
          .reduce((sum: number, rma: any) => {
            const found = (rma.items || []).find((ri: any) => ri.order_item_id === item.id);
            return sum + (found ? found.qty : 0);
          }, 0);

        const available = Math.max(0, item.qty - alreadyReturned);
        initial[item.id] = {
          selected: available > 0,
          qty: Math.max(1, available),
          maxQty: available,
        };
      });

      setSelectedItems(initial);
      setPickupAddress(order.delivery_address || "");
      setReason("damaged_defective");
      setCustomerNote("");
      setEvidencePhotos([]);
      setPhotoInput("");
      setRefundMethod("original_payment");
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        selected: !prev[id]?.selected,
      },
    }));
  };

  const updateQty = (id: string, qty: number) => {
    setSelectedItems((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const clamped = Math.min(item.maxQty, Math.max(1, qty));
      return {
        ...prev,
        [id]: {
          ...item,
          qty: clamped,
        },
      };
    });
  };

  const addPhoto = (url?: string) => {
    const targetUrl = url || photoInput.trim();
    if (!targetUrl) return;
    setEvidencePhotos((prev) => [...prev, targetUrl]);
    setPhotoInput("");
  };

  const removePhoto = (idx: number) => {
    setEvidencePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculate estimated refund total
  const estimatedRefundKobo = order.items.reduce((acc, item) => {
    const sel = selectedItems[item.id];
    if (sel?.selected && sel.maxQty > 0) {
      return acc + item.unit_price_kobo_snapshot * sel.qty;
    }
    return acc;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToSubmit = order.items
      .filter((item) => selectedItems[item.id]?.selected && selectedItems[item.id]?.maxQty > 0)
      .map((item) => ({
        order_item_id: item.id,
        qty: selectedItems[item.id].qty,
      }));

    if (itemsToSubmit.length === 0) {
      setError("Please select at least one item to return.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/customer/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          reason,
          customer_note: customerNote,
          evidence_images: evidencePhotos,
          refund_method: refundMethod,
          pickup_address: pickupAddress,
          items: itemsToSubmit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit return request.");
        return;
      }

      onSuccess(data.return_request);
      onClose();
    } catch (err: any) {
      setError(err.message || "Network error submitting return request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CornerDownLeft className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Request Return &bull; Order #{order.order_number}
              </h3>
              <p className="text-xs text-slate-400">
                Select items, describe the issue, and pick your preferred refund method.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Selection */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              1. Select Items to Return
            </label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {order.items.map((item) => {
                const sel = selectedItems[item.id];
                const isAvailable = sel && sel.maxQty > 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      isAvailable ? (sel?.selected ? "bg-purple-50/40" : "hover:bg-slate-50") : "opacity-50 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={!isAvailable}
                        checked={sel?.selected || false}
                        onChange={() => toggleItem(item.id)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      {item.product?.image_urls && item.product.image_urls[0] ? (
                        <img
                          src={item.product.image_urls[0]}
                          alt={item.product_name_snapshot}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {item.product_name_snapshot}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Purchased: {item.qty} &bull; {formatKoboToNaira(item.unit_price_kobo_snapshot)}
                        </div>
                        {!isAvailable && (
                          <div className="text-[10px] text-rose-600 font-semibold">
                            Already returned / pending RMA
                          </div>
                        )}
                      </div>
                    </div>

                    {isAvailable && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-500">Qty:</span>
                        <select
                          disabled={!sel?.selected}
                          value={sel?.qty || 1}
                          onChange={(e) => updateQty(item.id, parseInt(e.target.value, 10))}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 disabled:opacity-50"
                        >
                          {Array.from({ length: sel.maxQty }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason for Return */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              2. Reason for Return
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-purple-500"
            >
              <option value="damaged_defective">Damaged / Defective Item</option>
              <option value="wrong_item_delivered">Wrong Item Delivered</option>
              <option value="quality_not_as_expected">Quality Not as Expected</option>
              <option value="size_fit_issue">Size / Fit Issue</option>
              <option value="changed_mind">Changed My Mind</option>
              <option value="other">Other Reason</option>
            </select>
          </div>

          {/* Customer Explanation Note */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              3. Description / Explanation (Optional)
            </label>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={2}
              placeholder="Tell us what was wrong with the item (e.g. scratch on watch glass, wrong color dress)..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-purple-500"
            />
          </div>

          {/* Evidence Photos */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              4. Photo Evidence (Recommended for damaged/wrong items)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                placeholder="Paste photo URL (e.g. https://images.unsplash.com/...)"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => addPhoto()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors shrink-0"
              >
                Add URL
              </button>
              <button
                type="button"
                onClick={() =>
                  addPhoto("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80")
                }
                className="px-2.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold rounded-xl text-[11px] transition-colors shrink-0"
                title="Use sample damaged package photo"
              >
                + Demo Photo
              </button>
            </div>

            {evidencePhotos.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {evidencePhotos.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt="Proof"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refund Resolution Method */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              5. Preferred Refund Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  refundMethod === "original_payment"
                    ? "bg-purple-50/50 border-purple-500 ring-2 ring-purple-200"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="refundMethod"
                    value="original_payment"
                    checked={refundMethod === "original_payment"}
                    onChange={() => setRefundMethod("original_payment")}
                    className="text-purple-600"
                  />
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-600" /> Paystack Card Refund
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 pl-5">
                  Refunded directly to the bank account/card used at checkout (3-5 business days).
                </p>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  refundMethod === "store_credit"
                    ? "bg-purple-50/50 border-purple-500 ring-2 ring-purple-200"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="refundMethod"
                    value="store_credit"
                    checked={refundMethod === "store_credit"}
                    onChange={() => setRefundMethod("store_credit")}
                    className="text-purple-600"
                  />
                  <span className="font-bold text-purple-900 text-xs flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Store Credit Voucher
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 pl-5">
                  Instant coupon voucher code with 100% value, valid for 1 year across all sectors.
                </p>
              </label>
            </div>
          </div>

          {/* Pickup Address */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" /> Courier Pickup Address
            </label>
            <input
              type="text"
              required
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Full street address in Nigeria where courier can collect items..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-purple-500"
            />
          </div>

          {/* Estimated Refund Total Banner */}
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-purple-700">
                Estimated Refund Amount
              </span>
              <div className="text-[11px] text-purple-600">
                Calculated for selected item quantities
              </div>
            </div>
            <div className="font-mono text-xl font-black text-purple-900">
              {formatKoboToNaira(estimatedRefundKobo)}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || estimatedRefundKobo === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  <CornerDownLeft className="w-4 h-4" /> Submit Return Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
