"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/cart-context";

export function HeaderCartButton() {
  const { totalItemsCount } = useCart();

  return (
    <Link
      href="/cart"
      className="relative p-2 text-slate-700 hover:text-slate-900 transition-colors"
      aria-label="View Cart"
    >
      <ShoppingBag className="w-5 h-5" />
      {totalItemsCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in-50">
          {totalItemsCount}
        </span>
      )}
    </Link>
  );
}
