"use client";

import { useEffect, useState } from "react";
import { Zap, Plus, Clock, Trash2, CheckCircle2, AlertCircle, RefreshCw, Tag, Calendar } from "lucide-react";
import { formatKoboToNaira } from "@/lib/utils";

interface FlashSaleItem {
  id: string;
  title: string;
  description?: string;
  discount_percentage: number;
  banner_text?: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  status: "active" | "upcoming" | "ended";
  products: Array<{
    id: string;
    name: string;
    slug: string;
    sector_name: string;
    original_price_kobo: number;
    promo_price_kobo: number;
    stock_qty: number;
  }>;
  created_at: string;
}

interface InventoryProduct {
  id: string;
  name: string;
  price_kobo: number;
  sector_name?: string;
}

export function AdminFlashSalesTab() {
  const [sales, setSales] = useState<FlashSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(25);
  const [bannerText, setBannerText] = useState("");
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 1);
    return d.toISOString().slice(0, 16);
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 16);
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/flash-sales");
      const data = await res.json();
      if (data.success) {
        setSales(data.flash_sales || []);
      }
    } catch (err) {
      console.error("Failed to load flash sales:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/admin/inventory");
      const data = await res.json();
      if (data.success && data.products) {
        setInventory(
          data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            price_kobo: p.price_kobo,
            sector_name: p.sector?.name,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load inventory for flash sale picker:", err);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchInventory();
  }, []);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Sale title is required");
    if (selectedProductIds.length === 0) return setError("Please select at least 1 product");
    if (discountPercentage < 1 || discountPercentage > 95) return setError("Discount % must be between 1 and 95");

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch("/api/admin/flash-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          discount_percentage: Number(discountPercentage),
          banner_text: bannerText.trim() || undefined,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          product_ids: selectedProductIds,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to create flash sale");
      } else {
        setShowCreateModal(false);
        setTitle("");
        setDescription("");
        setSelectedProductIds([]);
        fetchSales();
      }
    } catch (err) {
      setError("An unexpected error occurred while creating flash sale");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch("/api/admin/flash-sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      fetchSales();
    } catch (err) {
      console.error("Failed to toggle sale:", err);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this flash sale?")) return;
    try {
      await fetch(`/api/admin/flash-sales?id=${id}`, { method: "DELETE" });
      fetchSales();
    } catch (err) {
      console.error("Failed to delete sale:", err);
    }
  };

  const activeCount = sales.filter((s) => s.status === "active").length;
  const upcomingCount = sales.filter((s) => s.status === "upcoming").length;
  const totalProductsDiscounted = sales
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + s.products.length, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            Flash Sales & Timed Countdown Engine
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Launch high-urgency, time-bounded promotional events with live countdown tickers across the store.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSales}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setError(null);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Launch Flash Sale
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deals</span>
            <p className="text-2xl font-black text-slate-900">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Scheduled</span>
            <p className="text-2xl font-black text-slate-900">{upcomingCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discounted Items Live</span>
            <p className="text-2xl font-black text-slate-900">{totalProductsDiscounted}</p>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">All Promotional Campaigns</h3>
          <span className="text-xs text-slate-500">{sales.length} total events</span>
        </div>

        {loading && sales.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
            Loading flash sales...
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6" />
            </div>
            <p className="text-slate-800 font-semibold text-sm">No flash sales created yet</p>
            <p className="text-slate-500 text-xs mt-1">Create a limited-time flash event to boost storefront conversion.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {sales.map((sale) => (
              <div key={sale.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50/70 transition">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        sale.status === "active"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : sale.status === "upcoming"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {sale.status}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 truncate">{sale.title}</h4>
                    <span className="bg-rose-100 text-rose-700 font-extrabold text-xs px-2 py-0.5 rounded">
                      {sale.discount_percentage}% OFF
                    </span>
                  </div>

                  {sale.banner_text && (
                    <p className="text-xs text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded inline-block">
                      Banner: {sale.banner_text}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Start: {new Date(sale.start_time).toLocaleString("en-NG")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      End: {new Date(sale.end_time).toLocaleString("en-NG")}
                    </span>
                  </div>

                  {/* Included products */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sale.products.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-xs text-slate-700 font-medium"
                      >
                        <span className="truncate max-w-[150px]">{p.name}</span>
                        <span className="line-through text-slate-400 text-[10px]">{formatKoboToNaira(p.original_price_kobo)}</span>
                        <span className="text-emerald-600 font-bold text-[11px]">{formatKoboToNaira(p.promo_price_kobo)}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
                  <button
                    onClick={() => handleToggleActive(sale.id, sale.is_active)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                      sale.is_active
                        ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {sale.is_active ? "Pause Sale" : "Reactivate"}
                  </button>

                  <button
                    onClick={() => handleDeleteSale(sale.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Delete flash sale"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Flash Sale Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                Create New Flash Sale Event
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateSale} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midnight Cyber Blitz / Weekend Jewelry Splash"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Discount Percentage (%) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="95"
                    required
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Storefront Banner Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ⚡ 30% OFF Flash Sale on Premium Tech!"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Starts At *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ends At *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Product Multi-selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Participating Products ({selectedProductIds.length} selected) *
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 divide-y divide-slate-100 bg-slate-50/50">
                  {inventory.map((prod) => {
                    const isChecked = selectedProductIds.includes(prod.id);
                    return (
                      <label
                        key={prod.id}
                        className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-100 cursor-pointer rounded text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds((prev) => [...prev, prod.id]);
                              } else {
                                setSelectedProductIds((prev) => prev.filter((id) => id !== prod.id));
                              }
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className="truncate font-medium text-slate-800">{prod.name}</span>
                        </div>
                        <span className="text-slate-500 font-mono shrink-0">
                          {formatKoboToNaira(prod.price_kobo)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 text-white text-xs font-bold shadow-md hover:from-amber-700 hover:to-rose-700 disabled:opacity-50 transition"
                >
                  {submitting ? "Launching..." : "Publish Flash Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
