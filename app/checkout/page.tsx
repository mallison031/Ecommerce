"use client";

import React, { useState } from "react";
import { useCart } from "@/context/cart-context";
import { formatKoboToNaira } from "@/lib/utils";
import {
  NIGERIAN_STATES,
  LAGOS_ZONES,
  calculateShippingFee,
  FREE_SHIPPING_THRESHOLD_KOBO,
  LAGOS_EXPRESS_ADDON_KOBO,
} from "@/lib/shipping";
import {
  ShieldCheck,
  MessageCircle,
  ArrowLeft,
  Loader2,
  Truck,
  Sparkles,
  Zap,
  MapPin,
} from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const { items, subtotalKobo } = useCart();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [state, setState] = useState<string>("Lagos");
  const [lagosZone, setLagosZone] = useState<"lagos_mainland" | "lagos_island">("lagos_mainland");
  const [isExpress, setIsExpress] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Shipping Calculation
  const shipping = calculateShippingFee({
    state,
    lagosZone: state === "Lagos" ? lagosZone : undefined,
    subtotalKobo,
    isExpress: state === "Lagos" ? isExpress : false,
  });

  const totalKobo = subtotalKobo + shipping.shippingFeeKobo;

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900">Your cart is empty</h2>
        <p className="mt-2 text-sm text-slate-500">Please add items to your cart before checking out.</p>
        <div className="mt-6">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          deliveryAddress,
          state,
          lagosZone: state === "Lagos" ? lagosZone : undefined,
          isExpress: state === "Lagos" ? isExpress : false,
          whatsappOptIn,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize payment.");
      }

      // Redirect to Paystack Checkout URL
      window.location.href = data.authorizationUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Cart
      </Link>

      {/* Free Delivery Progress Banner */}
      <div className="mb-8 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-600" />
            {shipping.isFreeDelivery ? (
              <span className="text-emerald-700">🎉 Congratulations! You unlocked Free Delivery!</span>
            ) : (
              <span className="text-slate-800">
                Add <strong className="text-slate-900">{formatKoboToNaira(shipping.amountNeededForFreeDeliveryKobo)}</strong> more to get Free Delivery across Nigeria!
              </span>
            )}
          </div>
          <span className="text-slate-500">{shipping.freeDeliveryProgressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              shipping.isFreeDelivery ? "bg-emerald-500" : "bg-slate-900"
            }`}
            style={{ width: `${shipping.freeDeliveryProgressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200">
            <h1 className="text-xl font-bold text-slate-900">Guest Checkout</h1>
            <p className="text-xs text-slate-500 mt-1">
              No account required. Fill in your delivery and contact information below.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amaka Okafor"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amaka@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="text-[11px] text-slate-400">Order receipts & updates will be sent here.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="text-[11px] text-slate-400">For dispatch courier contact.</span>
                </div>
              </div>

              {/* Nigerian Destination State & Zone Selector */}
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-slate-600" />
                  Delivery Destination (Nigeria)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Delivery State <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                    >
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {state === "Lagos" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Lagos Zone <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={lagosZone}
                        onChange={(e) => setLagosZone(e.target.value as "lagos_mainland" | "lagos_island")}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      >
                        {LAGOS_ZONES.map((z) => (
                          <option key={z.code} value={z.code}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Same-day Express Addon for Lagos */}
                {state === "Lagos" && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isExpress}
                        onChange={(e) => setIsExpress(e.target.checked)}
                        className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          Same-Day Priority Express Dispatch (+{formatKoboToNaira(LAGOS_EXPRESS_ADDON_KOBO)})
                        </span>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Guaranteed same-day dispatch via dedicated dispatch rider within 4–6 hours across Lagos.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Street Address & Landmark <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House/Apartment #, Street name, Landmark, Area"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Live SLA and Courier Card */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-600" />
                    <div>
                      <span className="font-semibold text-slate-800">{shipping.zoneName} Delivery</span>
                      <p className="text-[11px] text-slate-500">Estimated SLA: {shipping.deliverySla}</p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">
                    {shipping.isFreeDelivery && !isExpress ? (
                      <span className="text-emerald-600 uppercase">FREE</span>
                    ) : (
                      formatKoboToNaira(shipping.shippingFeeKobo)
                    )}
                  </span>
                </div>
              </div>

              {/* Explicit WhatsApp Opt-in Checkbox */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={whatsappOptIn}
                    onChange={(e) => setWhatsappOptIn(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Send my order updates via WhatsApp
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Opt-in to get instant shipment tracking alerts and courier delivery updates directly on WhatsApp.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Initializing Paystack...
                    </>
                  ) : (
                    <>Pay with Paystack ({formatKoboToNaira(totalKobo)})</>
                  )}
                </button>
              </div>

              <div className="pt-3 flex items-center justify-center gap-2 text-slate-400 text-xs text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Secured 256-bit encrypted checkout powered by Paystack
              </div>
            </form>
          </div>
        </div>

        {/* Mini Order Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 h-fit space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Your Order Items</h2>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.productId} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-slate-800 line-clamp-1">{item.name}</span>
                  <span className="text-slate-400">Qty: {item.quantity}</span>
                </div>
                <span className="font-medium text-slate-900 shrink-0">
                  {formatKoboToNaira(item.priceKobo * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatKoboToNaira(subtotalKobo)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Delivery ({state})</span>
              {shipping.isFreeDelivery ? (
                <span className="text-emerald-600 font-semibold">FREE</span>
              ) : (
                <span>{formatKoboToNaira(shipping.originalFeeKobo - (isExpress ? LAGOS_EXPRESS_ADDON_KOBO : 0))}</span>
              )}
            </div>

            {isExpress && state === "Lagos" && (
              <div className="flex justify-between text-amber-700">
                <span>Priority Express Add-on</span>
                <span>+{formatKoboToNaira(LAGOS_EXPRESS_ADDON_KOBO)}</span>
              </div>
            )}

            <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-2 border-t border-slate-100">
              <span>Total to Pay</span>
              <span>{formatKoboToNaira(totalKobo)}</span>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>SLA: {shipping.deliverySla}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
