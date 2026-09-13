"use client";

import Link from "next/link";
import { formatKoboToNaira } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { ShoppingBag, Check, Heart } from "lucide-react";
import { useState } from "react";

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_kobo: number;
  stock_qty: number;
  image_urls: string[];
  sector_slug?: string;
}

export function ProductCard({
  product,
  sectorSlug,
}: {
  product: ProductData;
  sectorSlug?: string;
}) {
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [added, setAdded] = useState(false);

  const effectiveSectorSlug = sectorSlug || product.sector_slug || "products";
  const productHref = `/${effectiveSectorSlug}/${product.slug}`;
  const isOutOfStock = product.stock_qty <= 0;
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      priceKobo: product.price_kobo,
      imageUrl: product.image_urls[0],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      priceKobo: product.price_kobo,
      imageUrl: product.image_urls[0],
      sectorSlug: effectiveSectorSlug,
      inStock: !isOutOfStock,
    });
  };

  return (
    <div className="group bg-white rounded-xl border border-slate-200/80 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <Link href={productHref} className="block w-full h-full">
          <img
            src={product.image_urls[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                Out of stock
              </span>
            </div>
          )}
        </Link>

        {/* Low Stock Urgency Pill */}
        {!isOutOfStock && product.stock_qty <= 5 && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 bg-amber-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider animate-pulse">
              Only {product.stock_qty} left!
            </span>
          </div>
        )}

        {/* Floating Wishlist Toggle Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
            inWishlist
              ? "bg-white text-rose-500 hover:scale-110"
              : "bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-white hover:scale-110"
          }`}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          title={inWishlist ? "Saved in Wishlist" : "Save to Wishlist"}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? "fill-rose-500 text-rose-500 animate-in zoom-in-50" : ""}`} />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <Link href={productHref} className="block">
            <h3 className="font-semibold text-slate-900 text-sm line-clamp-1 group-hover:text-pink-600 transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
            {product.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-sm">
            {formatKoboToNaira(product.price_kobo)}
          </span>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              added
                ? "bg-emerald-600 text-white"
                : isOutOfStock
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" /> Added
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
