"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/context/wishlist-context";

export function HeaderWishlistButton() {
  const { wishlistCount } = useWishlist();

  return (
    <Link
      href="/wishlist"
      className="relative p-2 text-slate-700 hover:text-slate-900 transition-colors"
      aria-label="View Saved Wishlist"
      title="Saved Wishlist"
    >
      <Heart className={`w-5 h-5 ${wishlistCount > 0 ? "text-rose-500 fill-rose-500" : ""}`} />
      {wishlistCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in-50">
          {wishlistCount}
        </span>
      )}
    </Link>
  );
}
