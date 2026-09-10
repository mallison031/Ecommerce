"use client";

import React, { useState } from "react";
import { formatKoboToNaira } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Zap,
  MessageCircle,
  Check,
  Truck,
  ShieldCheck,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react";
import { NIGERIAN_STATES, calculateShippingFee } from "@/lib/shipping";

interface ProductDetailViewProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price_kobo: number;
    stock_qty: number;
    image_urls: string[];
  };
  sector: {
    name: string;
    slug: string;
  };
}

export function ProductDetailView({ product, sector }: ProductDetailViewProps) {
  const { addItem } = useCart();
  const router = useRouter();

  const [selectedImage, setSelectedImage] = useState(
    product.image_urls[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [estimateState, setEstimateState] = useState<string>("Lagos");

  const estimateShipping = calculateShippingFee({
    state: estimateState,
    subtotalKobo: product.price_kobo * quantity,
  });

  const isOutOfStock = product.stock_qty <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        priceKobo: product.price_kobo,
        imageUrl: product.image_urls[0],
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        priceKobo: product.price_kobo,
        imageUrl: product.image_urls[0],
      },
      quantity
    );
    router.push("/checkout");
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Aura Store! I would like to inquire about "${product.name}" (${formatKoboToNaira(
      product.price_kobo
    )}) in ${sector.name}. Is it available for immediate dispatch?`
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
      {/* Image Gallery */}
      <div className="space-y-4">
        <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
          <img
            src={selectedImage}
            alt={product.name}
            className="w-full h-full object-cover object-center"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {product.image_urls.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {product.image_urls.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  selectedImage === img
                    ? "border-slate-900 shadow-xs scale-105"
                    : "border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Information & Purchase Actions */}
      <div className="flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-semibold border border-pink-100">
            <Sparkles className="w-3 h-3" /> {sector.name}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {product.name}
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatKoboToNaira(product.price_kobo)}
            </span>

            {isOutOfStock ? (
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Unavailable
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                In Stock ({product.stock_qty} available)
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
            {product.description}
          </p>
        </div>

        {/* Actions Box */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-700">Quantity:</span>
              <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-xs">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 text-xs font-bold text-slate-900 min-w-[32px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock_qty, q + 1))}
                  className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Buttons: Add to Cart & Buy Now */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs ${
                added
                  ? "bg-emerald-600 text-white"
                  : isOutOfStock
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 active:scale-95"
              }`}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" /> Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" /> Add to Cart
                </>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                isOutOfStock
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
              }`}
            >
              <Zap className="w-4 h-4 text-pink-400" /> Buy Now
            </button>
          </div>

          {/* WhatsApp Direct Product Inquiry Button */}
          <a
            href={`https://wa.me/2348000000000?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Ask About This Item on WhatsApp
          </a>
        </div>

        {/* Interactive Delivery Estimator & Security */}
        <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Truck className="w-4 h-4 text-slate-700" />
                <span>Delivery Estimator</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500">Deliver to:</span>
                <select
                  value={estimateState}
                  onChange={(e) => setEstimateState(e.target.value)}
                  className="px-2 py-0.5 text-xs border border-slate-300 rounded-md bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1.5 border-t border-slate-200/60">
              <span>SLA ({estimateState}):</span>
              <span className="font-semibold text-slate-900">{estimateShipping.deliverySla}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span>Delivery Fee:</span>
              <span className="font-bold text-slate-900">
                {estimateShipping.isFreeDelivery ? (
                  <span className="text-emerald-600 uppercase">FREE DELIVERY</span>
                ) : (
                  formatKoboToNaira(estimateShipping.shippingFeeKobo)
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/70 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-600">
              Secured Checkout via <strong>Paystack</strong> • Cards, USSD & Instant Bank Transfer
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
