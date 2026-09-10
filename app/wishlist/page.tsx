"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatKoboToNaira } from "@/lib/utils";
import { useWishlist, WishlistItem } from "@/context/wishlist-context";
import { useCart } from "@/context/cart-context";
import {
  Heart,
  ShoppingBag,
  Trash2,
  Share2,
  ArrowRight,
  Check,
  MessageCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function WishlistPage() {
  const { items, removeFromWishlist, clearWishlist, wishlistCount } = useWishlist();
  const { addItem } = useCart();

  const [verifiedItems, setVerifiedItems] = useState<WishlistItem[]>(items);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [movingAll, setMovingAll] = useState(false);
  const [allMoved, setAllMoved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [movedMap, setMovedMap] = useState<Record<string, boolean>>({});

  // Verify real-time stock and prices against backend
  useEffect(() => {
    if (items.length === 0) {
      setVerifiedItems([]);
      return;
    }

    const verifyStock = async () => {
      setLoadingVerify(true);
      try {
        const res = await fetch("/api/wishlist/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: items.map((i) => i.productId) }),
        });
        const data = await res.json();
        if (data.success && data.products) {
          // Merge verified real-time stock
          const verifiedMap = new Map(data.products.map((p: any) => [p.productId, p]));
          setVerifiedItems(
            items.map((item) => {
              const live = verifiedMap.get(item.productId) as any;
              return {
                ...item,
                priceKobo: live ? live.priceKobo : item.priceKobo,
                inStock: live ? live.inStock : item.inStock,
                sectorSlug: live?.sectorSlug || item.sectorSlug,
                sectorName: live?.sectorName || item.sectorName,
              };
            })
          );
        } else {
          setVerifiedItems(items);
        }
      } catch (e) {
        console.error("Failed verifying wishlist details:", e);
        setVerifiedItems(items);
      } finally {
        setLoadingVerify(false);
      }
    };

    verifyStock();
  }, [items]);

  const handleMoveSingleToCart = (item: WishlistItem) => {
    addItem({
      productId: item.productId,
      name: item.name,
      slug: item.slug,
      priceKobo: item.priceKobo,
      imageUrl: item.imageUrl,
    });
    setMovedMap((prev) => ({ ...prev, [item.productId]: true }));
    setTimeout(() => {
      setMovedMap((prev) => ({ ...prev, [item.productId]: false }));
    }, 2000);
  };

  const handleMoveAllToCart = () => {
    const inStockItems = verifiedItems.filter((i) => i.inStock !== false);
    if (inStockItems.length === 0) return;

    setMovingAll(true);
    for (const item of inStockItems) {
      addItem({
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        priceKobo: item.priceKobo,
        imageUrl: item.imageUrl,
      });
    }

    setAllMoved(true);
    setTimeout(() => {
      setMovingAll(false);
      setAllMoved(false);
    }, 2500);
  };

  const handleShareWishlist = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const shareText = encodeURIComponent(
    `Check out my saved items from Aura Store Nigeria:\n` +
      verifiedItems.map((i) => `• ${i.name} - ${formatKoboToNaira(i.priceKobo)}`).join("\n") +
      `\n\nShop at Aura Store!`
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">Saved Wishlist</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> Customer Favorites
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            My Saved Wishlist
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {wishlistCount === 0
              ? "You haven't saved any items yet."
              : `You have ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"} saved for later.`}
          </p>
        </div>

        {wishlistCount > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleShareWishlist}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Link Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" /> Share Link
                </>
              )}
            </button>

            <a
              href={`https://wa.me/?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
              title="Share Wishlist on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>

            <button
              type="button"
              onClick={handleMoveAllToCart}
              disabled={movingAll || allMoved}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
            >
              {allMoved ? (
                <>
                  <Check className="w-3.5 h-3.5" /> All Items Moved!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" /> Move All to Cart
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {wishlistCount === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8 space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Your Wishlist is Empty</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Explore our curated collections of Fine Jewelry, Girly Essentials, Creator Tech, and Souvenirs.
            Click the heart icon on any item to save it here for later!
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
            >
              Explore Sectors <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Wishlist Items Grid */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {verifiedItems.map((item) => {
              const effectiveSector = item.sectorSlug || "products";
              const productUrl = `/${effectiveSector}/${item.slug}`;
              const isItemMoved = Boolean(movedMap[item.productId]);

              return (
                <div
                  key={item.productId}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-md"
                >
                  <div>
                    {/* Image Box */}
                    <div className="relative aspect-square bg-slate-100 overflow-hidden">
                      <Link href={productUrl}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            item.imageUrl ||
                            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"
                          }
                          alt={item.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      </Link>

                      {/* Stock Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        {item.inStock === false ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                            In Stock
                          </span>
                        )}
                      </div>

                      {/* Remove from Wishlist Button */}
                      <button
                        type="button"
                        onClick={() => removeFromWishlist(item.productId)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-600 shadow-xs flex items-center justify-center transition-all hover:scale-110"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Content Details */}
                    <div className="p-4 space-y-2">
                      {item.sectorName && (
                        <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">
                          {item.sectorName}
                        </span>
                      )}
                      <Link href={productUrl} className="block">
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-pink-600 transition-colors">
                          {item.name}
                        </h3>
                      </Link>
                      <div className="text-base font-extrabold text-slate-900">
                        {formatKoboToNaira(item.priceKobo)}
                      </div>
                    </div>
                  </div>

                  {/* Move to Cart Action Footer */}
                  <div className="p-4 pt-0">
                    <button
                      type="button"
                      disabled={item.inStock === false || isItemMoved}
                      onClick={() => handleMoveSingleToCart(item)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                        isItemMoved
                          ? "bg-emerald-600 text-white"
                          : item.inStock === false
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-slate-900 hover:bg-slate-800 text-white active:scale-95"
                      }`}
                    >
                      {isItemMoved ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" /> Move to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clear Wishlist Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
            <Link href="/" className="font-semibold text-pink-600 hover:underline">
              ← Continue Shopping
            </Link>
            <button
              type="button"
              onClick={() => {
                if (confirm("Are you sure you want to clear your entire wishlist?")) {
                  clearWishlist();
                }
              }}
              className="text-slate-400 hover:text-rose-600 font-medium transition-colors"
            >
              Clear entire wishlist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
