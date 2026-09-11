"use client";

import React, { useState } from "react";
import { formatKoboToNaira } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
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
  Star,
  Heart,
  Bell,
  AlertCircle,
  X,
  Loader2,
  Gift,
  Edit3,
  CheckCircle2,
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
  ratingSummary?: {
    averageRating: number;
    totalReviews: number;
    verifiedBuyersCount: number;
  };
}

export function ProductDetailView({ product, sector, ratingSummary }: ProductDetailViewProps) {
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const router = useRouter();

  const inWishlist = isInWishlist(product.id);

  const handleToggleWishlist = () => {
    toggleWishlist({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      priceKobo: product.price_kobo,
      imageUrl: product.image_urls[0],
      sectorSlug: sector.slug,
      sectorName: sector.name,
      inStock: product.stock_qty > 0,
    });
  };

  const [selectedImage, setSelectedImage] = useState(
    product.image_urls[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [estimateState, setEstimateState] = useState<string>("Lagos");

  // Personalization & Engraving State
  const [customEngravingEnabled, setCustomEngravingEnabled] = useState(false);
  const [customEngravingText, setCustomEngravingText] = useState("");
  const [engravingFont, setEngravingFont] = useState<"script" | "serif" | "sans">("script");
  const [giftWrap, setGiftWrap] = useState(false);

  const supportsCustomization =
    sector.slug === "jewelry-accessories" ||
    sector.slug === "kitchen-souvenirs" ||
    Boolean((product as any).supports_engraving);

  // Restock Waitlist State
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [submittingWaitlist, setSubmittingWaitlist] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState<string | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim() || !waitlistEmail.includes("@")) {
      setWaitlistError("Please provide a valid email address.");
      return;
    }

    setSubmittingWaitlist(true);
    setWaitlistError(null);
    try {
      const res = await fetch(`/api/products/${product.id}/notify-restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail.trim(), phone: waitlistPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWaitlistError(data.error || "Failed to join waitlist. Please try again.");
      } else {
        setWaitlistSuccess(data.message);
        setTimeout(() => {
          setShowWaitlistModal(false);
          setWaitlistSuccess(null);
          setWaitlistEmail("");
          setWaitlistPhone("");
        }, 2500);
      }
    } catch (err) {
      setWaitlistError("Network error. Please try again.");
    } finally {
      setSubmittingWaitlist(false);
    }
  };

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
        customEngraving:
          customEngravingEnabled && customEngravingText.trim()
            ? customEngravingText.trim()
            : undefined,
        engravingFont:
          customEngravingEnabled && customEngravingText.trim()
            ? engravingFont
            : undefined,
        giftWrap: giftWrap,
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
        customEngraving:
          customEngravingEnabled && customEngravingText.trim()
            ? customEngravingText.trim()
            : undefined,
        engravingFont:
          customEngravingEnabled && customEngravingText.trim()
            ? engravingFont
            : undefined,
        giftWrap: giftWrap,
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

          {ratingSummary && ratingSummary.totalReviews > 0 && (
            <a
              href="#reviews-section"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 group"
            >
              <div className="flex items-center gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(ratingSummary.averageRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-slate-900 font-bold">{ratingSummary.averageRating.toFixed(1)}</span>
              <span className="text-slate-400 group-hover:underline">
                ({ratingSummary.totalReviews} {ratingSummary.totalReviews === 1 ? "review" : "reviews"})
              </span>
              {ratingSummary.verifiedBuyersCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-bold">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Verified Buyers
                </span>
              )}
            </a>
          )}

          <div className="flex items-center gap-4">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatKoboToNaira(product.price_kobo)}
            </span>

            {isOutOfStock ? (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 uppercase tracking-wider">
                Out of Stock
              </span>
            ) : product.stock_qty <= 5 ? (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Only {product.stock_qty} left in stock!
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
          {/* Personalization & Custom Engraving Studio */}
          {supportsCustomization && !isOutOfStock && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/70 to-pink-50/70 border border-amber-200/70 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={customEngravingEnabled}
                    onChange={(e) => setCustomEngravingEnabled(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    Personalize with Custom Engraving / Name Tag
                  </span>
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Free
                </span>
              </div>

              {customEngravingEnabled && (
                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-700">Enter Engraving Text:</span>
                      <span>{customEngravingText.length}/30 characters</span>
                    </div>
                    <input
                      type="text"
                      maxLength={30}
                      value={customEngravingText}
                      onChange={(e) => setCustomEngravingText(e.target.value)}
                      placeholder="e.g. Amaka & Tunde 2026 or Always in My Heart"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                    />
                  </div>

                  {/* Font Style Selector */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[11px] font-semibold text-slate-600">Font Style:</span>
                    {(["script", "serif", "sans"] as const).map((font) => (
                      <button
                        key={font}
                        type="button"
                        onClick={() => setEngravingFont(font)}
                        className={`px-2.5 py-1 rounded text-xs capitalize transition-all cursor-pointer ${
                          engravingFont === font
                            ? "bg-slate-900 text-white font-bold shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        } ${
                          font === "script"
                            ? "italic font-serif"
                            : font === "serif"
                            ? "font-serif"
                            : "font-sans"
                        }`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>

                  {/* Live Visual Engraving Plaque Preview */}
                  {customEngravingText.trim() && (
                    <div className="p-3 bg-gradient-to-r from-amber-100/80 via-yellow-50 to-amber-100/80 rounded-lg border border-amber-300/80 text-center shadow-inner">
                      <div className="text-[10px] uppercase tracking-widest text-amber-800 font-semibold mb-1">
                        ✨ Live Engraving Preview
                      </div>
                      <div
                        className={`text-slate-950 font-bold tracking-wide select-none ${
                          engravingFont === "script"
                            ? "italic font-serif tracking-widest text-base text-amber-950"
                            : engravingFont === "serif"
                            ? "font-serif text-sm text-slate-900"
                            : "font-sans uppercase text-xs tracking-wider text-slate-900"
                        }`}
                      >
                        "{customEngravingText.trim()}"
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Luxury Velvet Gift Box Addon */}
              <div className="pt-2 border-t border-amber-200/50 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(e) => setGiftWrap(e.target.checked)}
                    className="rounded border-amber-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-pink-600" />
                    Luxury Velvet Gift Box & Ribbon Wrapping
                  </span>
                </label>
                <span className="text-xs font-bold text-slate-900">+₦1,500</span>
              </div>
            </div>
          )}

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

          {/* Out of Stock Waitlist Banner & Action */}
          {isOutOfStock && (
            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900">
                  Item Temporarily Sold Out
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Join our priority waitlist. We will notify you immediately via email when fresh warehouse inventory arrives.
              </p>
              <button
                type="button"
                onClick={() => setShowWaitlistModal(true)}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Bell className="w-3.5 h-3.5 text-amber-200" /> Notify Me When Back in Stock
              </button>
            </div>
          )}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
              inWishlist
                ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? "fill-rose-500 text-rose-500 animate-in zoom-in-50" : "text-slate-400"}`} />
            <span>{inWishlist ? "Saved in Your Wishlist" : "Save to Wishlist"}</span>
          </button>

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

      {/* Restock Notification Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Restock Alert Notification
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Get alerted when this item is back in stock
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWaitlistModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <img
                src={product.image_urls[0]}
                alt={product.name}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {product.name}
                </h4>
                <p className="text-[11px] font-semibold text-slate-500">
                  {formatKoboToNaira(product.price_kobo)}
                </p>
              </div>
            </div>

            {waitlistSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-medium text-center space-y-1">
                <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                <p>{waitlistSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleJoinWaitlist} className="space-y-3">
                {waitlistError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    {waitlistError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    WhatsApp Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={waitlistPhone}
                    onChange={(e) => setWaitlistPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWaitlistModal(false)}
                    disabled={submittingWaitlist}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingWaitlist}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors shadow-xs"
                  >
                    {submittingWaitlist ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5 text-amber-400" /> Notify Me
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
