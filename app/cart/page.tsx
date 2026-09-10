"use client";

import { useCart } from "@/context/cart-context";
import { formatKoboToNaira } from "@/lib/utils";
import Link from "next/link";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, MessageCircle } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotalKobo, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Your cart is empty</h2>
        <p className="mt-2 text-sm text-slate-500">
          Looks like you haven't added anything to your cart yet.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shopping Cart</h1>
          <p className="text-xs text-slate-500 mt-1">Review your selected items</p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-slate-400 hover:text-red-600 transition-colors"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Item List */}
        <div className="md:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200"
            >
              <img
                src={item.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80"}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover bg-slate-100 shrink-0"
              />

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{item.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{formatKoboToNaira(item.priceKobo)}</p>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="p-1 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-semibold text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-1 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-slate-900">
                  {formatKoboToNaira(item.priceKobo * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 h-fit space-y-4">
          <h2 className="text-base font-bold text-slate-900">Order Summary</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatKoboToNaira(subtotalKobo)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span className="text-xs text-emerald-600 font-semibold">Calculated at checkout</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-900">
            <span>Total</span>
            <span>{formatKoboToNaira(subtotalKobo)}</span>
          </div>

          <Link
            href="/checkout"
            className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all"
          >
            Proceed to Checkout <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="pt-2 text-center">
            <a
              href="https://wa.me/2348000000000?text=Hello%2C%20I%20have%20questions%20about%20my%20cart"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Need help before checking out?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
