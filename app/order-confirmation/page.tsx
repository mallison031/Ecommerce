"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/cart-context";
import Link from "next/link";
import { CheckCircle2, MessageCircle, ArrowRight, Package, Sparkles } from "lucide-react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const { clearCart } = useCart();
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    clearCart();
    setShowAnimation(true);
  }, [clearCart]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      {/* Celebratory Animated Payment Success Badge */}
      <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
        {showAnimation && (
          <>
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping duration-1000" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center animate-bounce shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </>
        )}
        <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border-2 border-emerald-300 shadow-xl animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="w-10 h-10 animate-in spin-in-12 duration-700" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
        <Sparkles className="w-3 h-3 text-emerald-600" /> Payment Confirmed
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
        Thank You for Your Order!
      </h1>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        Your payment is confirmed. Your official receipt and invoice are generated automatically and sent to your email.
      </p>

      {orderId && (
        <div className="mt-4 inline-block bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold">
          Order ID: {orderId}
        </div>
      )}

      <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-left flex items-start gap-3">
        <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900">
          <span className="font-bold">Need instant updates or want to track your courier?</span>
          <p className="mt-1 text-emerald-800">
            If you opted in, you'll receive WhatsApp notifications directly. You can also chat with our support team at any time.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        {orderId && (
          <Link
            href={`/track-order?order=${encodeURIComponent(orderId)}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-pink-600 text-white text-sm font-semibold hover:bg-pink-700 transition-all shadow-sm"
          >
            <Package className="w-4 h-4" /> Track Order Status
          </Link>
        )}
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all"
        >
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading order status...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
