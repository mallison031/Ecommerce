"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/cart-context";
import Link from "next/link";
import { CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Thank You for Your Order!</h1>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        Your payment is being confirmed via Paystack. Your official receipt and invoice are generated automatically and sent to your email.
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

      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
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
