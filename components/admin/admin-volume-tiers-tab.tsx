"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Percent,
  Package,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface Tier {
  id: string;
  min_quantity: number;
  max_quantity?: number | null;
  discount_percentage: number;
  created_at: string;
}

interface ProductWithTiers {
  id: string;
  name: string;
  slug: string;
  price_kobo: number;
  stock_qty: number;
  volume_tiers: Tier[];
}

export function AdminVolumeTiersTab() {
  const [products, setProducts] = useState<ProductWithTiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal / Add state
  const [selectedProduct, setSelectedProduct] = useState<ProductWithTiers | null>(null);
  const [minQty, setMinQty] = useState("3");
  const [maxQty, setMaxQty] = useState("");
  const [discountPct, setDiscountPct] = useState("10");
  const [submitting, setSubmitting] = useState(false);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/volume-tiers");
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Error fetching volume tiers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const handleCreateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/volume-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          min_quantity: parseInt(minQty, 10),
          max_quantity: maxQty ? parseInt(maxQty, 10) : null,
          discount_percentage: parseInt(discountPct, 10),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: data.message });
        setSelectedProduct(null);
        setMinQty("3");
        setMaxQty("");
        setDiscountPct("10");
        fetchTiers();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save tier." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error saving tier." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm("Are you sure you want to delete this volume tier?")) return;
    try {
      const res = await fetch(`/api/admin/volume-tiers?id=${tierId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Volume tier removed successfully." });
        fetchTiers();
      }
    } catch (err) {
      console.error("Error deleting tier:", err);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Wholesale & Volume Pricing Tiers
            </h2>
            <p className="text-xs text-slate-500">
              Configure quantity break thresholds and percentage discounts for wholesale bulk buyers.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchTiers}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search products by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-pink-500"
        />
      </div>

      {/* Products with Tiers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>Base Price: <strong className="text-slate-700">{formatNaira(product.price_kobo)}</strong></span>
                    <span>•</span>
                    <span>Stock: <strong>{product.stock_qty}</strong></span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold shrink-0 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Tier
                </button>
              </div>

              {/* Tiers List */}
              <div className="mt-4 space-y-2">
                {product.volume_tiers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No volume tiers configured. Regular single-unit pricing applies.
                  </p>
                ) : (
                  product.volume_tiers.map((t) => {
                    const discountedUnitKobo = Math.round(
                      product.price_kobo * ((100 - t.discount_percentage) / 100)
                    );
                    return (
                      <div
                        key={t.id}
                        className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">
                            {t.max_quantity
                              ? `${t.min_quantity} – ${t.max_quantity} units`
                              : `${t.min_quantity}+ units`}
                          </span>
                          <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                            {t.discount_percentage}% OFF
                          </span>
                          <span className="ml-2 text-slate-500 text-[11px]">
                            ({formatNaira(discountedUnitKobo)}/unit)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTier(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Tier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Volume Tier Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Configure Bulk Discount Tier
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedProduct.name} ({formatNaira(selectedProduct.price_kobo)})
              </p>
            </div>

            <form onSubmit={handleCreateTier} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Quantity *
                  </label>
                  <input
                    type="number"
                    min="2"
                    required
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Quantity (Optional)
                  </label>
                  <input
                    type="number"
                    min={parseInt(minQty || "2", 10) + 1}
                    placeholder="No upper limit"
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discount Percentage (% OFF) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-pink-500 pr-8"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Example: 15 will reduce unit price from {formatNaira(selectedProduct.price_kobo)} to{" "}
                  {formatNaira(
                    Math.round(
                      selectedProduct.price_kobo *
                        ((100 - parseInt(discountPct || "0", 10)) / 100)
                    )
                  )}
                  .
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-xs transition-colors"
                >
                  {submitting ? "Saving..." : "Save Volume Tier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
