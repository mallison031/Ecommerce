"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  BellRing,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Loader2,
  Check,
  TrendingDown,
  PackageCheck,
  Tag,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { useCart } from "@/context/cart-context";

interface WatchlistItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  sector_slug: string;
  sector_name: string;
  image_url: string | null;
  current_price_kobo: number;
  initial_price_kobo: number;
  target_price_kobo: number | null;
  is_price_dropped: boolean;
  price_drop_amount_kobo: number;
  price_drop_percentage: number;
  stock_qty: number;
  is_back_in_stock: boolean;
  notify_price_drop: boolean;
  notify_restock: boolean;
  created_at: string;
}

export function CustomerWatchlistTab() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const { addItem } = useCart();

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customer/watchlist");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setItems(data.watchlist || []);
        }
      }
    } catch (err) {
      console.error("Failed to load customer watchlist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/customer/watchlist?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error("Failed to remove watchlist item:", err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = (item: WatchlistItem) => {
    addItem({
      productId: item.product_id,
      name: item.product_name,
      slug: item.product_slug,
      priceKobo: item.current_price_kobo,
      imageUrl: item.image_url || "",
    });
    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 2000);
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-2">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-rose-600" />
        <p className="text-xs">Loading price alerts & watchlist...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Bell className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">No Product Alerts Set</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You are not tracking any products yet. Click "Track Price / Alert" on any item in our store to receive instant back-in-stock and price drop notifications.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            <span>Explore Collections</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Price Drop & Restock Watchlist</h2>
          <p className="text-xs text-slate-500">
            Monitoring {items.length} items for discounts and inventory replenishment.
          </p>
        </div>
        <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full self-start sm:self-auto">
          {items.filter((i) => i.is_price_dropped).length} Price Drop(s) Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-3 relative"
          >
            <div className="flex gap-3">
              {/* Product Thumbnail */}
              <div className="w-20 h-20 relative rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.product_name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Tag className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-600">
                  {item.sector_name}
                </span>
                <Link
                  href={`/${item.sector_slug}/${item.product_slug}`}
                  className="font-bold text-slate-900 text-xs hover:text-pink-600 transition block line-clamp-1"
                >
                  {item.product_name}
                </Link>

                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {formatNaira(item.current_price_kobo)}
                  </span>
                  {item.is_price_dropped && (
                    <span className="font-mono text-[11px] text-slate-400 line-through">
                      {formatNaira(item.initial_price_kobo)}
                    </span>
                  )}
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.is_price_dropped && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      <TrendingDown className="w-3 h-3" />
                      Save {formatNaira(item.price_drop_amount_kobo)} (-{item.price_drop_percentage}%)
                    </span>
                  )}

                  {item.stock_qty <= 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                      Out of Stock
                    </span>
                  ) : item.is_back_in_stock ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                      <PackageCheck className="w-3 h-3 text-amber-600" />
                      In Stock ({item.stock_qty} available)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">In Stock</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={removingId === item.id}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition p-1"
                title="Stop tracking alerts for this product"
              >
                {removingId === item.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Remove Alert</span>
              </button>

              <button
                type="button"
                disabled={item.stock_qty <= 0}
                onClick={() => handleAddToCart(item)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 ${
                  addedIds[item.id]
                    ? "bg-emerald-600 text-white"
                    : item.stock_qty <= 0
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
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
          </div>
        ))}
      </div>
    </div>
  );
}
