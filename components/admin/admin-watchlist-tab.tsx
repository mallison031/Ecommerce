"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  TrendingDown,
  PackageCheck,
  AlertTriangle,
  Loader2,
  RefreshCcw,
  Users,
  Search,
  CheckCircle2,
  Mail,
  Phone,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface DemandProduct {
  product_id: string;
  product_name: string;
  product_slug: string;
  sector_name: string;
  price_kobo: number;
  stock_qty: number;
  total_subscribers: number;
  restock_subscribers: number;
  price_drop_subscribers: number;
  subscribers: Array<{
    email: string;
    phone: string | null;
    customer_name: string | null;
    target_price_kobo: number | null;
    created_at: string;
  }>;
}

interface WatchlistMetrics {
  total_subscribers: number;
  restock_alerts_count: number;
  price_drop_alerts_count: number;
  products_watched_count: number;
  out_of_stock_backlog_items: number;
}

export function AdminWatchlistTab() {
  const [metrics, setMetrics] = useState<WatchlistMetrics | null>(null);
  const [products, setProducts] = useState<DemandProduct[]>([]);
  const [recentSubscribers, setRecentSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "out_of_stock" | "price_drops">("all");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/watchlist");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics);
          setProducts(data.demand_by_product || []);
          setRecentSubscribers(data.recent_subscribers || []);
        }
      }
    } catch (err) {
      console.error("Failed to load admin watchlist data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.sector_name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "out_of_stock") {
      return p.stock_qty <= 0;
    }
    if (filter === "price_drops") {
      return p.price_drop_subscribers > 0;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 space-y-2">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-600" />
        <p className="text-xs">Loading customer alert demand insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Demand Intelligence: Back-in-Stock & Price Drop Watchlist
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time customer purchasing intent, out-of-stock demand backlog, and price alert subscriptions.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Total Subscribers
              </span>
              <Users className="w-4 h-4 text-pink-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics.total_subscribers}
            </div>
            <p className="text-[10px] text-slate-400">Unique alerts active across store</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Restock Backlog
              </span>
              <PackageCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono">
              {metrics.restock_alerts_count}
            </div>
            <p className="text-[10px] text-slate-400">Waiting for inventory replenishment</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Price Drop Trackers
              </span>
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {metrics.price_drop_alerts_count}
            </div>
            <p className="text-[10px] text-slate-400">Targeting promotions & sales</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Sold-Out Items with Demand
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {metrics.out_of_stock_backlog_items}
            </div>
            <p className="text-[10px] text-slate-400">Products with active restock requests</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("out_of_stock")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              filter === "out_of_stock"
                ? "bg-rose-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Out of Stock Backlog
          </button>
          <button
            type="button"
            onClick={() => setFilter("price_drops")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              filter === "price_drops"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Price Drop Subscribers
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or sector..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Demand Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Highest Customer Demand by Product</h3>
          <span className="text-xs text-slate-500">Sorted by highest subscriber volume</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No products matched your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4">Current Price</th>
                  <th className="py-3 px-4">Warehouse Stock</th>
                  <th className="py-3 px-4">Restock Requests</th>
                  <th className="py-3 px-4">Price Drop Alerts</th>
                  <th className="py-3 px-4 text-right">Total Demand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.product_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.sector_name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {formatNaira(p.price_kobo)}
                    </td>
                    <td className="py-3 px-4">
                      {p.stock_qty <= 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                          0 units (Out of Stock)
                        </span>
                      ) : p.stock_qty <= 5 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {p.stock_qty} units (Low)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {p.stock_qty} units
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-800">
                      {p.restock_subscribers}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      {p.price_drop_subscribers}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-sm text-slate-900">
                      {p.total_subscribers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Subscribers List */}
      {recentSubscribers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Recent Customer Alert Subscriptions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentSubscribers.slice(0, 9).map((sub) => (
              <div
                key={sub.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate max-w-[170px]">
                    {sub.product_name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{sub.email}</span>
                </p>
                {sub.phone && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{sub.phone}</span>
                  </p>
                )}
                <div className="flex gap-1 pt-1">
                  {sub.notify_restock && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                      Restock
                    </span>
                  )}
                  {sub.notify_price_drop && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      Price Drop
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
