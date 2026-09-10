"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatKoboToNaira } from "@/lib/utils";
import {
  ShoppingBag,
  CheckCircle2,
  Lock,
  ArrowRight,
  Tag,
  MessageCircle,
  AlertCircle,
  Loader2,
  Package,
} from "lucide-react";
import Link from "next/link";

interface ResumedOrder {
  id: string;
  order_number: number;
  status: string;
  total_kobo: number;
  delivery_address: string;
  created_at: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    whatsapp_opt_in: boolean;
  };
  items: Array<{
    id: string;
    product_name_snapshot: string;
    unit_price_kobo_snapshot: number;
    qty: number;
    line_total_kobo: number;
  }>;
}

function ResumeCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order") || searchParams.get("orderId");
  const initialCode = searchParams.get("code") || "";

  const [order, setOrder] = useState<ResumedOrder | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discountCode, setDiscountCode] = useState(initialCode);
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  const [codeApplied, setCodeApplied] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("No order specified. Please use the link provided in your recovery message.");
      return;
    }

    const loadOrder = async () => {
      try {
        const res = await fetch(`/api/checkout/resume?orderId=${orderId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Order not found");
        }

        setOrder(data.order);
        setAlreadyPaid(data.alreadyPaid);

        if (initialCode && (initialCode.toUpperCase() === "SAVE5" || initialCode.toUpperCase() === "RECOVER5")) {
          const disc = Math.round(data.order.total_kobo * 0.05);
          setAppliedDiscount(disc);
          setCodeApplied(true);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load order.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, initialCode]);

  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const clean = discountCode.trim().toUpperCase();
    if (clean === "SAVE5" || clean === "RECOVER5") {
      const disc = Math.round(order.total_kobo * 0.05);
      setAppliedDiscount(disc);
      setCodeApplied(true);
      setError(null);
    } else {
      setError("Invalid discount code. Try 'SAVE5'");
    }
  };

  const handlePay = async () => {
    if (!order) return;
    setPaying(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          discountCode: codeApplied ? discountCode : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize payment.");
      }

      window.location.href = data.authorizationUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not initialize payment.";
      setError(msg);
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
        <p className="text-sm text-slate-500 font-medium">Retrieving your saved checkout...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Checkout Session Expired or Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            Go to Storefront
          </Link>
          <a
            href="https://wa.me/2348000000000?text=Hi,%20I%20need%20help%20completing%20my%20order"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp Support
          </a>
        </div>
      </div>
    );
  }

  if (alreadyPaid && order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Order #{order.order_number} Already Paid!</h2>
        <p className="mt-2 text-sm text-slate-600">
          This order has already been successfully confirmed. Our fulfillment team is preparing it for dispatch!
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href={`/order-confirmation?order=${order.id}`}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            View Order Receipt
          </Link>
          <Link
            href={`/track-order?query=${order.order_number}`}
            className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Track Live Shipment
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const finalTotalKobo = appliedDiscount ? Math.max(0, order.total_kobo - appliedDiscount) : order.total_kobo;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header Notification Banner */}
      <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950">We saved your items! Complete checkout now</h3>
            <p className="text-xs text-amber-800">
              Reserved for <strong>{order.customer.name}</strong> • Order #{order.order_number}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-amber-200 text-amber-900 rounded-full shrink-0">
          Express 1-Click Pay
        </span>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Order Items & Delivery Summary */}
        <div className="md:col-span-2 space-y-6">
          {/* Items Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-slate-600" />
              Items in Your Bag ({order.items.reduce((acc, i) => acc + i.qty, 0)})
            </h2>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{item.product_name_snapshot}</p>
                    <p className="text-xs text-slate-500">
                      Qty: {item.qty} × {formatKoboToNaira(item.unit_price_kobo_snapshot)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900">{formatKoboToNaira(item.line_total_kobo)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 mb-3">Delivery Information</h2>
            <div className="text-xs space-y-1.5 text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Recipient:</span> {order.customer.name}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Email:</span> {order.customer.email}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Phone:</span> {order.customer.phone}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Destination:</span> {order.delivery_address}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Price Breakdown & Instant Checkout Action */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Payment Summary</h2>

            {/* Discount Promo Input */}
            <form onSubmit={handleApplyDiscount} className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Have a discount code?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. SAVE5"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors"
                >
                  Apply
                </button>
              </div>
              {codeApplied && (
                <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 5% recovery discount applied!
                </p>
              )}
            </form>

            <div className="space-y-2 text-xs border-t border-slate-100 pt-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatKoboToNaira(order.total_kobo)}</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Recovery Discount (5%)</span>
                  <span>- {formatKoboToNaira(appliedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className="text-emerald-600 font-medium">Free Dispatch Promo</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-3">
                <span>Total Due</span>
                <span>{formatKoboToNaira(finalTotalKobo)}</span>
              </div>
            </div>

            {/* Instant Pay Button */}
            <button
              onClick={handlePay}
              disabled={paying}
              className="mt-6 w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 transition-all cursor-pointer"
            >
              {paying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Paystack...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Pay with Paystack ({formatKoboToNaira(finalTotalKobo)})
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Secured by Paystack • Cards, USSD & Bank Transfer</span>
            </div>

            {/* WhatsApp Assistance */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <a
                href={`https://wa.me/2348000000000?text=${encodeURIComponent(
                  `Hi, I am completing Order #${order.order_number} and need assistance.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Need help or prefer direct bank transfer?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResumeCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
          <p className="text-sm text-slate-500">Loading checkout session...</p>
        </div>
      }
    >
      <ResumeCheckoutContent />
    </Suspense>
  );
}
