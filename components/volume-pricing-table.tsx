"use client";

import React, { useState, useEffect } from "react";
import { Tag, TrendingDown, Layers, Check } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface Tier {
  id: string;
  min_quantity: number;
  max_quantity?: number | null;
  discount_percentage: number;
  unit_price_kobo: number;
  savings_per_unit_kobo: number;
}

interface VolumePricingTableProps {
  productId: string;
  basePriceKobo: number;
  selectedQty?: number;
  onSelectTierQty?: (qty: number) => void;
}

export function VolumePricingTable({
  productId,
  basePriceKobo,
  selectedQty = 1,
  onSelectTierQty,
}: VolumePricingTableProps) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTiers() {
      try {
        const res = await fetch(`/api/products/${productId}/volume-tiers`);
        const data = await res.json();
        if (res.ok && data.success) {
          setTiers(data.tiers || []);
        }
      } catch (err) {
        console.error("Error loading volume tiers:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTiers();
  }, [productId]);

  if (loading || tiers.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Layers className="w-4 h-4 text-pink-600" />
          <span>Wholesale & Bulk Volume Savings</span>
        </div>
        <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-full">
          Save up to {Math.max(...tiers.map((t) => t.discount_percentage))}%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {tiers.map((tier) => {
          const isSelected =
            selectedQty >= tier.min_quantity &&
            (!tier.max_quantity || selectedQty <= tier.max_quantity);

          return (
            <div
              key={tier.id}
              onClick={() => onSelectTierQty?.(tier.min_quantity)}
              className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-pink-50/80 border-pink-500 text-pink-900 shadow-xs ring-1 ring-pink-500/30"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>
                  {tier.max_quantity
                    ? `${tier.min_quantity} – ${tier.max_quantity} units`
                    : `${tier.min_quantity}+ units`}
                </span>
                <span className="text-emerald-600 text-[11px]">
                  {tier.discount_percentage}% OFF
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[11px]">
                <span className="font-semibold text-slate-900">
                  {formatNaira(tier.unit_price_kobo)}/ea
                </span>
                <span className="text-[10px] text-slate-500">
                  Save {formatNaira(tier.savings_per_unit_kobo)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        * Tier discount automatically calculated and applied to your order at checkout.
      </p>
    </div>
  );
}
