"use client";

import Link from "next/link";
import { formatKoboToNaira } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { ShoppingBag, Check } from "lucide-react";
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
  const [added, setAdded] = useState(false);

  const effectiveSectorSlug = sectorSlug || product.sector_slug || "products";
  const productHref = `/${effectiveSectorSlug}/${product.slug}`;

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

  const isOutOfStock = product.stock_qty <= 0;

  return (
    <div className="group bg-white rounded-xl border border-slate-200/80 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
      <Link href={productHref} className="relative aspect-square overflow-hidden bg-slate-100 block">
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
