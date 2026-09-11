"use client";

import React, { useState, useEffect } from "react";
import { formatKoboToNaira } from "@/lib/utils";
import {
  RefreshCcw,
  Search,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  Eye,
  X,
  RotateCcw,
  Sparkles,
  Check,
} from "lucide-react";

export interface ReturnItem {
  id: string;
  order_item_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price_kobo: number;
  qty: number;
  item_refund_kobo: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    stock_qty: number;
    image_urls: string[];
  };
}

export interface ReturnRequestData {
  id: string;
  rma_number: string;
  order_id: string;
  customer_id: string;
  status: "requested" | "approved" | "rejected" | "in_transit" | "received" | "refunded" | "cancelled";
  reason: "damaged_defective" | "wrong_item_delivered" | "quality_not_as_expected" | "size_fit_issue" | "changed_mind" | "other";
  customer_note: string | null;
  evidence_images: string[];
  refund_method: "original_payment" | "store_credit";
  pickup_address: string | null;
  return_courier: string | null;
  return_tracking_num: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  refund_amount_kobo: number;
  refund_reference: string | null;
  restocked: boolean;
  approved_at: string | null;
  in_transit_at: string | null;
  received_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  order: {
    id: string;
    order_number: number;
    total_kobo: number;
    subtotal_kobo: number;
    currency: string;
    status: string;
    delivery_address: string;
    delivered_at: string | null;
    payment?: {
      paystack_reference: string;
      amount_kobo: number;
    } | null;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    whatsapp_phone_e164: string | null;
  };
  items: ReturnItem[];
}

export interface ReturnMetrics {
  total: number;
  requested: number;
  approved: number;
  in_transit: number;
  received: number;
  refunded: number;
  rejected: number;
  cancelled: number;
  totalRefundedKobo: number;
}

export default function AdminReturnsTab() {
  const [returns, setReturns] = useState<ReturnRequestData[]>([]);
  const [metrics, setMetrics] = useState<ReturnMetrics>({
    total: 0,
    requested: 0,
    approved: 0,
    in_transit: 0,
    received: 0,
    refunded: 0,
    rejected: 0,
    cancelled: 0,
    totalRefundedKobo: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequestData | null>(null);

  // Modal Action State
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form fields for RMA actions
  const [courierName, setCourierName] = useState("GIG Logistics");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [restockInventory, setRestockInventory] = useState(true);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/returns?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReturns(data.returns || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to fetch returns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [statusFilter, searchQuery]);

  const openActionModal = (rma: ReturnRequestData) => {
    setSelectedReturn(rma);
    setCourierName(rma.return_courier || "GIG Logistics");
    setTrackingNumber(rma.return_tracking_num || `GIG-RET-${Math.floor(100000 + Math.random() * 900000)}`);
    setAdminNote(rma.admin_notes || "");
    setRejectionReason(rma.rejection_reason || "");
    setRestockInventory(true);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleUpdateStatus = async (
    targetStatus: string,
    additionalPayload: Record<string, any> = {}
  ) => {
    if (!selectedReturn) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = {
        status: targetStatus,
        admin_notes: adminNote,
        ...additionalPayload,
      };

      const res = await fetch(`/api/admin/returns/${selectedReturn.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to update return status");
        return;
      }

      setActionSuccess(
        `RMA status updated to '${targetStatus}'. ${
          data.store_credit_code ? `Store Credit Issued: ${data.store_credit_code}` : ""
        }`
      );

      // Refresh list and selected item
      fetchReturns();
      if (data.return_request) {
        setSelectedReturn(data.return_request);
      }
    } catch (err: any) {
      setActionError(err.message || "Network error updating return");
    } finally {
      setActionLoading(false);
    }
  };

  const reasonLabels: Record<string, string> = {
    damaged_defective: "Damaged / Defective",
    wrong_item_delivered: "Wrong Item Delivered",
    quality_not_as_expected: "Quality Not as Expected",
    size_fit_issue: "Size / Fit Issue",
    changed_mind: "Changed Mind",
    other: "Other Reason",
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "in_transit":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "received":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "refunded":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "cancelled":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total RMAs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Pending Review
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{metrics.requested}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-xs">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> In Transit
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {metrics.approved + metrics.in_transit}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-xs">
          <div className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Warehouse Recv
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">{metrics.received}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Refunded
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.refunded}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Total Refunded
          </div>
          <div className="text-base font-black text-slate-900 mt-2 truncate">
            {formatKoboToNaira(metrics.totalRefundedKobo)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { key: "all", label: `All (${metrics.total})` },
            { key: "requested", label: `Pending (${metrics.requested})` },
            { key: "approved", label: `Approved (${metrics.approved})` },
            { key: "in_transit", label: `In Transit (${metrics.in_transit})` },
            { key: "received", label: `Received (${metrics.received})` },
            { key: "refunded", label: `Refunded (${metrics.refunded})` },
            { key: "rejected", label: `Rejected (${metrics.rejected})` },
          ].map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setStatusFilter(pill.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === pill.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search RMA #, Order #, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <span className="text-xs">Loading returns...</span>
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-sm text-slate-700">No Return Requests Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {statusFilter !== "all"
                ? `There are currently no returns in '${statusFilter}' status.`
                : "Customer returns and refund requests will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">RMA & Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Reason & Items</th>
                  <th className="py-3 px-4">Refund Amount</th>
                  <th className="py-3 px-4">Resolution</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((rma) => {
                  const customerPhone =
                    rma.customer.whatsapp_phone_e164 || rma.customer.phone;
                  return (
                    <tr key={rma.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900">{rma.rma_number}</div>
                        <div className="text-[11px] text-slate-400">Order #{rma.order.order_number}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{rma.customer.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{rma.customer.email}</span>
                          {customerPhone && (
                            <a
                              href={`https://wa.me/${customerPhone.replace(/\+/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 font-bold hover:underline"
                              title="Message customer on WhatsApp"
                            >
                              WA
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="inline-block px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-100 text-slate-700">
                          {reasonLabels[rma.reason] || rma.reason}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1 truncate">
                          {rma.items.length} item(s): {rma.items.map((i) => `${i.qty}x ${i.product_name_snapshot}`).join(", ")}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        {formatKoboToNaira(rma.refund_amount_kobo)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            rma.refund_method === "store_credit"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {rma.refund_method === "store_credit" ? "Store Credit" : "Paystack Card"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                            rma.status
                          )}`}
                        >
                          {rma.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(rma.created_at).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openActionModal(rma)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                        >
                          Manage RMA
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          RMA Action Modal & Workflow Drawer
      ======================================================== */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RefreshCcw className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    RMA Management: {selectedReturn.rma_number}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order #{selectedReturn.order.order_number} &bull; Customer:{" "}
                    {selectedReturn.customer.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600">
              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Current Lifecycle State
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-xs border ${getStatusBadge(
                        selectedReturn.status
                      )}`}
                    >
                      {selectedReturn.status.replace("_", " ")}
                    </span>
                    {selectedReturn.restocked && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Warehouse Restocked
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Refund Total
                  </span>
                  <div className="font-mono text-base font-black text-slate-900 mt-0.5">
                    {formatKoboToNaira(selectedReturn.refund_amount_kobo)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Via {selectedReturn.refund_method === "store_credit" ? "Store Credit" : "Paystack Card"}
                  </span>
                </div>
              </div>

              {/* Notification & Alerts */}
              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Returned Items */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                  Items to Return ({selectedReturn.items.length})
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {selectedReturn.items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {item.product?.image_urls && item.product.image_urls[0] ? (
                          <img
                            src={item.product.image_urls[0]}
                            alt={item.product_name_snapshot}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{item.product_name_snapshot}</div>
                          <div className="text-[11px] text-slate-400">
                            Returning {item.qty} unit(s) &times; {formatKoboToNaira(item.unit_price_kobo)}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        {formatKoboToNaira(item.item_refund_kobo)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return Reason & Evidence Photos */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Customer Reason & Evidence
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <span className="font-semibold text-slate-500">Reason: </span>
                    <span className="font-bold text-slate-900">
                      {reasonLabels[selectedReturn.reason] || selectedReturn.reason}
                    </span>
                  </div>

                  {selectedReturn.customer_note && (
                    <div>
                      <span className="font-semibold text-slate-500">Explanation: </span>
                      <p className="mt-1 text-slate-800 bg-white p-3 rounded-xl border border-slate-200 italic">
                        &ldquo;{selectedReturn.customer_note}&rdquo;
                      </p>
                    </div>
                  )}

                  {selectedReturn.evidence_images && selectedReturn.evidence_images.length > 0 ? (
                    <div>
                      <span className="font-semibold text-slate-500 block mb-2">Photo Evidence:</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedReturn.evidence_images.map((img, idx) => (
                          <a
                            key={idx}
                            href={img}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative group"
                          >
                            <img
                              src={img}
                              alt="Evidence photo"
                              className="w-16 h-16 rounded-xl object-cover border border-slate-300 hover:opacity-80 transition-opacity"
                            />
                            <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white rounded-md p-0.5 text-[9px]">
                              <Eye className="w-2.5 h-2.5" />
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400">No photographic evidence attached.</div>
                  )}
                </div>
              </div>

              {/* Pickup & Courier Dispatch Details */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Pickup & Logistics Dispatch
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <span className="font-semibold text-slate-500">Pickup Address: </span>
                    <span className="font-medium text-slate-800">
                      {selectedReturn.pickup_address || selectedReturn.order.delivery_address}
                    </span>
                  </div>

                  {selectedReturn.status === "requested" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Assign Return Courier
                        </label>
                        <select
                          value={courierName}
                          onChange={(e) => setCourierName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                        >
                          <option value="GIG Logistics">GIG Logistics</option>
                          <option value="Fez Delivery">Fez Delivery</option>
                          <option value="Speedaf Express">Speedaf Express</option>
                          <option value="Gokada">Gokada (Same-Day Lagos)</option>
                          <option value="DHL Nigeria">DHL Nigeria</option>
                          <option value="Custom Courier">Custom Courier / Aura Fleet</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Pickup Tracking / Waybill #
                        </label>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="e.g. GIG-RET-8849"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-500">Courier: </span>
                        <span className="font-bold">{selectedReturn.return_courier || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Tracking #: </span>
                        <span className="font-mono font-bold">
                          {selectedReturn.return_tracking_num || "N/A"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Notes & Feedback */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Internal / Customer Feedback Notes
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                  placeholder="Notes on inspection condition, courier instructions, or refund reference..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:outline-hidden"
                />
              </div>

              {/* Status Specific Action Options */}
              {selectedReturn.status === "received" && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restockInventory}
                      onChange={(e) => setRestockInventory(e.target.checked)}
                      disabled={selectedReturn.restocked}
                      className="rounded text-purple-600"
                    />
                    <span className="font-bold text-purple-900">
                      {selectedReturn.restocked
                        ? "Items already restocked into warehouse inventory"
                        : "Restock items back into product warehouse inventory"}
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. If 'requested' -> Approve or Reject */}
                {selectedReturn.status === "requested" && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        handleUpdateStatus("rejected", {
                          rejection_reason:
                            adminNote || "Return request could not be accepted under policy.",
                        })
                      }
                      className="px-3 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors"
                    >
                      Reject Return
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        handleUpdateStatus("approved", {
                          return_courier: courierName,
                          return_tracking_num: trackingNumber,
                        })
                      }
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approve & Dispatch Pickup
                    </button>
                  </>
                )}

                {/* 2. If 'approved' -> Mark In Transit */}
                {selectedReturn.status === "approved" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("in_transit")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                    Mark Picked Up & In Transit
                  </button>
                )}

                {/* 3. If 'in_transit' -> Mark Received & Inspected */}
                {selectedReturn.status === "in_transit" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      handleUpdateStatus("received", {
                        restock: restockInventory,
                      })
                    }
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                    Confirm Received & Inspected
                  </button>
                )}

                {/* 4. If 'received' -> Issue Refund */}
                {selectedReturn.status === "received" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      handleUpdateStatus("refunded", {
                        restock: restockInventory,
                      })
                    }
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Issue Refund ({formatKoboToNaira(selectedReturn.refund_amount_kobo)})
                  </button>
                )}

                {/* 5. If 'refunded' -> Finished badge */}
                {selectedReturn.status === "refunded" && (
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    Refund Completed ({selectedReturn.refund_reference || "Processed"})
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
