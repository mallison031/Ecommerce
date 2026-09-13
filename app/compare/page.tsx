"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCompareStore, CompareProductItem } from "@/lib/stores/compare-store";
import { useCart } from "@/context/cart-context";
import {
  Scale,
  X,
  ShoppingBag,
  ArrowRight,
  Check,
  Zap,
  Sparkles,
  Share2,
  Trash2,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

export default function ComparePage() {
  const { items, removeItem, clear } = useCompareStore();
  const { addItem } = useCart();
  const [mounted, setMounted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <Scale className="w-8 h-8 mx-auto animate-pulse text-pink-500 mb-2" />
        <p>Loading comparison matrix...</p>
      </div>
    );
  }

  const handleAddToCart = (item: CompareProductItem) => {
    addItem({
      productId: item.id,
      name: item.name,
      slug: item.slug,
      priceKobo: item.price_kobo,
      imageUrl: item.image_url,
    });
    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 2000);
  };

  const handleAddAll = () => {
    items.forEach((item) => {
      if (item.stock_qty > 0) {
        addItem({
          productId: item.id,
          name: item.name,
          slug: item.slug,
          priceKobo: item.price_kobo,
          imageUrl: item.image_url,
        });
      }
    });
    alert(`Added all available products to your cart!`);
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 shadow-sm">
          <Scale className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Your Comparison Matrix is Empty
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            You haven't selected any products to compare yet. Browse our collections and click "Compare" to evaluate specs, pricing, and features side by side.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-md"
          >
            Explore Catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Find lowest price item for comparison highlight
  const lowestPrice = Math.min(...items.map((i) => i.price_kobo));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition">
          Home
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">Compare Products</span>
      </nav>

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[11px] font-extrabold uppercase tracking-wider mb-1">
            <Scale className="w-3.5 h-3.5" /> Spec Matrix
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Side-by-Side Product Comparison
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comparing {items.length} of 4 products. Evaluate prices, availability, and features.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? "Link Copied!" : "Share Link"}</span>
          </button>

          <button
            type="button"
            onClick={handleAddAll}
            className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add All In-Stock to Cart</span>
          </button>

          <button
            type="button"
            onClick={clear}
            className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition flex items-center gap-1.5"
            title="Clear all from comparison"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Matrix</span>
          </button>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="overflow-x-auto pb-6">
        <table className="w-full min-w-[700px] border-collapse bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="p-4 w-48 text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">
                Product Details
              </th>
              {items.map((item) => (
                <th key={item.id} className="p-4 align-top min-w-[220px]">
                  <div className="relative space-y-3">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition"
                      title="Remove product"
                      aria-label={`Remove ${item.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="w-full h-44 relative rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                      {item.price_kobo === lowestPrice && items.length > 1 && (
                        <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Best Value
                        </div>
                      )}
                    </div>

                    <div>
                      <Link
                        href={`/${item.sector_slug}/${item.slug}`}
                        className="font-bold text-slate-900 text-sm hover:text-pink-600 transition line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      <div className="text-base font-extrabold text-slate-900 font-mono mt-1">
                        {formatNaira(item.price_kobo)}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={item.stock_qty <= 0}
                      onClick={() => handleAddToCart(item)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs ${
                        addedIds[item.id]
                          ? "bg-emerald-600 text-white"
                          : item.stock_qty <= 0
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      {addedIds[item.id] ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added!
                        </>
                      ) : item.stock_qty <= 0 ? (
                        "Sold Out"
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {/* Sector / Collection */}
            <tr>
              <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Collection</td>
              {items.map((item) => (
                <td key={item.id} className="p-4 capitalize text-slate-600 font-medium">
                  {item.sector_slug.replace("-", " & ")}
                </td>
              ))}
            </tr>

            {/* Price & Savings */}
            <tr>
              <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Pricing & Value</td>
              {items.map((item) => (
                <td key={item.id} className="p-4 font-mono">
                  <span className="font-bold text-slate-900">{formatNaira(item.price_kobo)}</span>
                  {item.price_kobo === lowestPrice && items.length > 1 && (
                    <span className="ml-2 text-[10px] text-emerald-600 font-sans font-bold">
                      (Lowest price in compare)
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Inventory Status */}
            <tr>
              <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Availability</td>
              {items.map((item) => (
                <td key={item.id} className="p-4">
                  {item.stock_qty > 10 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                      <Check className="w-3 h-3" /> In Stock ({item.stock_qty} left)
                    </span>
                  ) : item.stock_qty > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                      ⚡ Low Stock ({item.stock_qty} units)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                      Temporarily Sold Out
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Custom Engraving */}
            <tr>
              <td className="p-4 font-bold text-slate-700 bg-slate-50/50">
                Custom Engraving & Gift Wrap
              </td>
              {items.map((item) => (
                <td key={item.id} className="p-4">
                  {item.supports_engraving ? (
                    <span className="inline-flex items-center gap-1 text-pink-700 font-bold">
                      <Sparkles className="w-3.5 h-3.5" /> Supported (Free Preview)
                    </span>
                  ) : (
                    <span className="text-slate-400">Standard packaging</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Shipping & Delivery Options */}
            <tr>
              <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Delivery Estimates</td>
              {items.map((item) => (
                <td key={item.id} className="p-4 space-y-1 text-slate-600">
                  <div className="flex items-center gap-1 text-slate-900 font-semibold">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lagos Express (Same-Day) Available</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Nationwide Courier: 2–5 business days
                  </div>
                </td>
              ))}
            </tr>

            {/* Description / Summary */}
            <tr>
              <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Overview & Notes</td>
              {items.map((item) => (
                <td key={item.id} className="p-4 text-slate-600 leading-relaxed text-[11px]">
                  {item.description || "Premium quality product with authentic verification."}
                </td>
              ))}
            </tr>

            {/* Final Action Row */}
            <tr className="bg-slate-50/50">
              <td className="p-4 font-bold text-slate-700">Actions</td>
              {items.map((item) => (
                <td key={item.id} className="p-4">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={item.stock_qty <= 0}
                      onClick={() => handleAddToCart(item)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 ${
                        addedIds[item.id]
                          ? "bg-emerald-600 text-white"
                          : item.stock_qty <= 0
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-pink-600 text-white hover:bg-pink-700"
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{addedIds[item.id] ? "Added!" : "Add to Cart"}</span>
                    </button>
                    <Link
                      href={`/${item.sector_slug}/${item.slug}`}
                      className="text-center text-[11px] font-bold text-slate-700 hover:text-pink-600 transition py-1"
                    >
                      View Full Details →
                    </Link>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
