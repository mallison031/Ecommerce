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
  FileText,
  Search,
  X,
  Loader2,
} from "lucide-react";

interface Order {
  id: string;
  order_number: number;
  status: string;
  total_kobo: number;
  delivery_address: string;
  courier_name?: string | null;
  tracking_number?: string | null;
  dispatch_notes?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Dispatch Modal State
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [dispatchCourier, setDispatchCourier] = useState("GIG Logistics");
  const [dispatchTracking, setDispatchTracking] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

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

  const openDispatchModal = (order: Order) => {
    setDispatchOrder(order);
    setDispatchCourier(order.courier_name || "GIG Logistics");
    setDispatchTracking(order.tracking_number || "");
    setDispatchNotes(order.dispatch_notes || "");
  };

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;
    setSubmittingDispatch(true);
    try {
      const res = await fetch(`/api/admin/orders/${dispatchOrder.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "shipped",
          courier_name: dispatchCourier.trim() || null,
          tracking_number: dispatchTracking.trim() || null,
          dispatch_notes: dispatchNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setDispatchOrder(null);
        await fetchOrders();
      }
    } catch (e) {
      console.error("Failed submitting dispatch:", e);
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const orderNumMatch = String(o.order_number).includes(q);
    const nameMatch = o.customer.name.toLowerCase().includes(q);
    const emailMatch = o.customer.email.toLowerCase().includes(q);
    const phoneMatch = o.customer.phone.toLowerCase().includes(q);
    const trackingMatch = o.tracking_number ? o.tracking_number.toLowerCase().includes(q) : false;
    const courierMatch = o.courier_name ? o.courier_name.toLowerCase().includes(q) : false;
    return orderNumMatch || nameMatch || emailMatch || phoneMatch || trackingMatch || courierMatch;
  });

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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
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

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order #, customer, tracking..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
                    <th className="p-3.5">Status & Dispatch</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No orders match the current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
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
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]" title={order.delivery_address}>
                            📍 {order.delivery_address}
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
                          <div>
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

                            {order.courier_name && (
                              <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-700">
                                <Truck className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>{order.courier_name}</span>
                              </div>
                            )}
                            {order.tracking_number && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                #{order.tracking_number}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            {order.status === "paid" && (
                              <button
                                onClick={() => openDispatchModal(order)}
                                disabled={updatingId === order.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                              >
                                <Truck className="w-3.5 h-3.5" /> Dispatch
                              </button>
                            )}

                            {order.status === "shipped" && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(order.id, "delivered")}
                                  disabled={updatingId === order.id}
                                  className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                                >
                                  Delivered
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(order.id, "returned")}
                                  disabled={updatingId === order.id}
                                  className="px-2 py-1.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold"
                                >
                                  Return
                                </button>
                              </>
                            )}

                            {/* Documents: Packing slip & Receipt */}
                            {["paid", "shipped", "delivered"].includes(order.status) && (
                              <>
                                <a
                                  href={`/api/orders/${order.id}/receipt?type=packing_slip`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                  title="Download Packing Slip"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`/api/orders/${order.id}/receipt`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                  title="Download Official Receipt"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
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

      {/* Dispatch & Fulfillment Modal */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Dispatch Order #{dispatchOrder.order_number}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign courier and trigger customer dispatch notifications
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDispatchOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipient & Package Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient:</span>
                <span className="font-semibold text-slate-900">{dispatchOrder.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="text-slate-800">{dispatchOrder.customer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Address:</span>
                <span className="font-medium text-slate-800 max-w-[280px] text-right truncate">
                  {dispatchOrder.delivery_address}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Items ({dispatchOrder.items.reduce((s, i) => s + i.qty, 0)}):</span>
                <span>{formatKoboToNaira(dispatchOrder.total_kobo)}</span>
              </div>
            </div>

            {/* Dispatch Form */}
            <form onSubmit={handleConfirmDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Select Courier / Delivery Partner
                </label>
                <select
                  value={dispatchCourier}
                  onChange={(e) => setDispatchCourier(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-900"
                >
                  <option value="GIG Logistics">GIG Logistics</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="Fez Delivery">Fez Delivery</option>
                  <option value="Speedaf Express">Speedaf Express</option>
                  <option value="Gokada / Max.ng">Gokada / Max.ng</option>
                  <option value="Local Dispatch Bike">Local Dispatch Bike</option>
                  <option value="In-Store Pickup">In-Store Pickup</option>
                  <option value="Other">Other Courier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Waybill / Tracking Number
                </label>
                <input
                  type="text"
                  value={dispatchTracking}
                  onChange={(e) => setDispatchTracking(e.target.value)}
                  placeholder="e.g. GIG-29183921 or Waybill # (optional)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Dispatch Notes / Rider Contact
                </label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Rider Tunde (08012345678), deliver before 4 PM"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 text-[11px] text-blue-900 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  Confirming dispatch will automatically update order status to{" "}
                  <strong>shipped</strong> and trigger customer notification emails and WhatsApp alerts.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchOrder(null)}
                  disabled={submittingDispatch}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispatch}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-xs"
                >
                  {submittingDispatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                    </>
                  ) : (
                    <>
                      <Truck className="w-3.5 h-3.5" /> Confirm & Ship Order
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
