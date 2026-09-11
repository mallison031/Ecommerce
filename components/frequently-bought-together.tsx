"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Check, ShoppingBag, Loader2 } from "lucide-react";
import { useCart } from "@/context/cart-context";

interface BundleProduct {
  id: string;
  name: string;
  slug: string;
  price_kobo: number;
  stock_qty: number;
  image_urls: string[];
  sector_slug?: string;
  sector_name?: string;
}

interface FrequentlyBoughtTogetherProps {
  primaryProduct: {
    id: string;
    name: string;
    slug: string;
    price_kobo: number;
    stock_qty: number;
    image_urls: string[];
    sector_slug?: string;
  };
}

export function FrequentlyBoughtTogether({ primaryProduct }: FrequentlyBoughtTogetherProps) {
  const { addItem } = useCart();
  const [bundleItems, setBundleItems] = useState<BundleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    async function loadBundles() {
      try {
        const res = await fetch(`/api/products/${primaryProduct.id}/bundles`);
        const data = await res.json();
        if (res.ok && data.success) {
          const items: BundleProduct[] = data.bundleItems || [];
          setBundleItems(items);

          // By default, select the primary product and all recommended bundle items
          const initialSelected: Record<string, boolean> = {
            [primaryProduct.id]: true,
          };
          items.forEach((item) => {
            initialSelected[item.id] = true;
          });
          setSelectedMap(initialSelected);
        }
      } catch (err) {
        console.error("Failed to load bundles:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBundles();
  }, [primaryProduct.id]);

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 animate-pulse flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // If no complementary items found, do not display
  if (bundleItems.length === 0) {
    return null;
  }

  const allItems: BundleProduct[] = [
    {
      id: primaryProduct.id,
      name: primaryProduct.name,
      slug: primaryProduct.slug,
      price_kobo: primaryProduct.price_kobo,
      stock_qty: primaryProduct.stock_qty,
      image_urls: primaryProduct.image_urls,
      sector_slug: primaryProduct.sector_slug,
    },
    ...bundleItems,
  ];

  const toggleItem = (id: string) => {
    setSelectedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const selectedItems = allItems.filter((item) => selectedMap[item.id]);
  const totalKobo = selectedItems.reduce((acc, item) => acc + item.price_kobo, 0);
  const selectedCount = selectedItems.length;

  const handleAddBundleToCart = () => {
    if (selectedCount === 0) return;

    selectedItems.forEach((item) => {
      addItem({
        productId: item.id,
        name: item.name,
        slug: item.slug,
        priceKobo: item.price_kobo,
        imageUrl: item.image_urls[0] || "/placeholder.jpg",
      });
    });

    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2200);
  };

  return (
    <section className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white shadow-xs">
      <div className="mb-6">
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
          Frequently Bought Together
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Pair these customer-favorite items together for the complete experience
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Left: Interactive Visual Cards connected by '+' */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4 flex-1">
          {allItems.map((item, idx) => {
            const isSelected = Boolean(selectedMap[item.id]);
            const isPrimary = item.id === primaryProduct.id;

            return (
              <React.Fragment key={item.id}>
                {idx > 0 && (
                  <div className="text-slate-400 font-bold">
                    <Plus className="w-5 h-5 text-slate-400" />
                  </div>
                )}

                <div
                  onClick={() => toggleItem(item.id)}
                  className={`relative group cursor-pointer border rounded-xl p-2.5 transition-all w-28 sm:w-36 flex flex-col items-center text-center ${
                    isSelected
                      ? "border-slate-900 bg-slate-50/50 shadow-2xs"
                      : "border-slate-200 bg-white opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* Selection Checkbox Pill */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-slate-900 rounded-md border-slate-300 focus:ring-slate-900 cursor-pointer"
                    />
                  </div>

                  {isPrimary && (
                    <span className="absolute -top-2.5 right-2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      This Item
                    </span>
                  )}

                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-slate-100 mb-2 mt-1">
                    <Image
                      src={item.image_urls[0] || "/placeholder.jpg"}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <span className="text-xs font-semibold text-slate-900 line-clamp-2 leading-tight">
                    {item.name}
                  </span>
                  <span className="text-xs font-bold text-slate-900 mt-1">
                    ₦{(item.price_kobo / 100).toLocaleString()}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right: Price Total and 1-Click Action Box */}
        <div className="lg:w-72 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-center space-y-4">
          <div>
            <span className="text-xs text-slate-500 font-medium">
              Total Price for ({selectedCount} item{selectedCount === 1 ? "" : "s"}):
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              ₦{(totalKobo / 100).toLocaleString()}
            </div>
          </div>

          <button
            onClick={handleAddBundleToCart}
            disabled={selectedCount === 0 || addedSuccess}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
              addedSuccess
                ? "bg-emerald-600 text-white"
                : selectedCount === 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            {addedSuccess ? (
              <>
                <Check className="w-4 h-4" /> Added {selectedCount} to Cart!
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" /> Add All {selectedCount} to Cart
              </>
            )}
          </button>

          {/* Item checklist breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
            {allItems.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 cursor-pointer hover:text-slate-900"
              >
                <input
                  type="checkbox"
                  checked={Boolean(selectedMap[item.id])}
                  onChange={() => toggleItem(item.id)}
                  className="rounded text-slate-900 w-3.5 h-3.5 focus:ring-0"
                />
                <span className="truncate">
                  {item.name} -{" "}
                  <strong className="text-slate-900">
                    ₦{(item.price_kobo / 100).toLocaleString()}
                  </strong>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
export default FrequentlyBoughtTogether;
