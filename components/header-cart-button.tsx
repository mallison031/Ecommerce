"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/cart-context";

export function HeaderCartButton() {
  const { totalItemsCount } = useCart();
  const [bumping, setBumping] = useState(false);

  useEffect(() => {
    if (totalItemsCount === 0) return;
    setBumping(true);
    const timer = setTimeout(() => setBumping(false), 400);
    return () => clearTimeout(timer);
  }, [totalItemsCount]);

  return (
    <Link
      href="/cart"
      className={`relative p-2 text-slate-700 hover:text-slate-900 transition-all ${
        bumping ? "scale-115 text-pink-600" : "scale-100"
      }`}
      aria-label="View Cart"
    >
      <ShoppingBag className={`w-5 h-5 transition-transform ${bumping ? "rotate-[-10deg]" : "rotate-0"}`} />
      {totalItemsCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 bg-pink-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center transition-transform ${
            bumping ? "scale-125 animate-bounce" : "scale-100"
          }`}
        >
          {totalItemsCount}
        </span>
      )}
    </Link>
  );
}
