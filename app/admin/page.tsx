"use client";

import React, { useState, useEffect } from "react";
import { formatKoboToNaira } from "@/lib/utils";
import {
  Package,
  CheckCircle,
  Truck,
  RotateCcw,
  AlertCircle,
  Download,
  Bell,
  RefreshCw,
} from "lucide-react";

interface Order {
  id: string;
  order_number: number;
  status: string;
  total_kobo: number;
  delivery_address: string;
  created_at: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    whatsapp_opt_in: boolean;
    whatsapp_phone_e164: string | null;
  };
  items: Array<{
    product_name_snapshot: string;
    qty: number;
    unit_price_kobo_snapshot: number;
    line_total_kobo: number;
  }>;
  invoice?: { invoice_number: number } | null;
  receipt?: { receipt_number: number } | null;
}

interface NotificationLog {
  id: string;
  channel: string;
  template_name: string | null;
  status: string;
  created_at: string;
  order: {
    order_number: number;
    customer: { name: string; email: string };
  };
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "sales" | "notifications">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/admin/orders?status=${statusFilter}` : "/api/admin/orders";
      const res = await fetch(url);
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (e) {
      console.error("Failed fetching orders:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      const data = await res.json();
      if (data.logs) setNotificationLogs(data.logs);
    } catch (e) {
      console.error("Failed fetching notification logs:", e);
    }
  };

  useEffect(() => {
    fetchOrders();
    if (activeTab === "notifications") {
      fetchLogs();
    }
  }, [statusFilter, activeTab]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchOrders();
      }
    } catch (e) {
      console.error("Failed updating order status:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const exportCsv = () => {
    const headers = ["Order Number,Date,Customer,Email,Phone,WhatsApp Opt-in,Status,Total (NGN)"];
    const rows = orders.map((o) =>
      [
        o.order_number,
        new Date(o.created_at).toISOString().split("T")[0],
        `"${o.customer.name}"`,
        o.customer.email,
        o.customer.phone,
        o.customer.whatsapp_opt_in ? "YES" : "NO",
        o.status,
        (o.total_kobo / 100).toFixed(2),
      ].join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalRevenueKobo = orders
    .filter((o) => ["paid", "shipped", "delivered"].includes(o.status))
    .reduce((sum, o) => sum + o.total_kobo, 0);

  const pendingCount = orders.filter((o) => o.status === "pending_payment").length;
  const paidCount = orders.filter((o) => o.status === "paid").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const abandonedCount = orders.filter((o) => o.status === "abandoned").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Store Management Portal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Fulfill orders, monitor sales performance, and audit notification logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchOrders();
              if (activeTab === "notifications") fetchLogs();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Sales CSV
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Confirmed Revenue</span>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatKoboToNaira(totalRevenueKobo)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Awaiting Shipment</span>
          <p className="text-lg font-bold text-indigo-600 mt-1">{paidCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">In Transit</span>
          <p className="text-lg font-bold text-emerald-600 mt-1">{shippedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Abandoned Checkouts</span>
          <p className="text-lg font-bold text-amber-600 mt-1">{abandonedCount}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === "orders"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Orders Fulfillment ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "notifications"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Bell className="w-4 h-4" /> Notification Logs
        </button>
      </div>

      {/* Tab: Orders */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter status:</span>
            {["", "pending_payment", "paid", "shipped", "delivered", "returned", "abandoned"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                  statusFilter === s
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s || "All"}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Order #</th>
                    <th className="p-3.5">Customer & Contact</th>
                    <th className="p-3.5">Items</th>
                    <th className="p-3.5">Total</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No orders match the current filter.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-900">
                          #{order.order_number}
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{order.customer.name}</div>
                          <div className="text-slate-500">{order.customer.email}</div>
                          <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                            {order.customer.phone}
                            {order.customer.whatsapp_opt_in && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                                WA Opted
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="max-w-xs space-y-0.5">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="truncate text-slate-800">
                                {item.qty}x {item.product_name_snapshot}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {formatKoboToNaira(order.total_kobo)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full font-semibold text-[11px] uppercase tracking-wider ${
                              order.status === "paid"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : order.status === "shipped"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : order.status === "delivered"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : order.status === "abandoned"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : order.status === "returned"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {order.status === "paid" && (
                              <button
                                onClick={() => handleUpdateStatus(order.id, "shipped")}
                                disabled={updatingId === order.id}
                                className="px-2.5 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                              >
                                Mark Shipped
                              </button>
                            )}

                            {order.status === "shipped" && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(order.id, "delivered")}
                                  disabled={updatingId === order.id}
                                  className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                                >
                                  Mark Delivered
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(order.id, "returned")}
                                  disabled={updatingId === order.id}
                                  className="px-2.5 py-1.5 rounded-md bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors"
                                >
                                  Mark Returned
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Notification Logs */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Audit trail of outbound WhatsApp and email messages. Spot failed or skipped delivery attempts here.
          </p>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Order</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Channel</th>
                  <th className="p-3.5">Template</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {notificationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No notification logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  notificationLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold text-slate-900">
                        #{log.order?.order_number}
                      </td>
                      <td className="p-3.5 font-medium">{log.order?.customer?.name}</td>
                      <td className="p-3.5 uppercase font-semibold text-slate-600">{log.channel}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {log.template_name || "N/A"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === "sent"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.status === "failed"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {new Date(log.created_at).toLocaleString("en-NG")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
