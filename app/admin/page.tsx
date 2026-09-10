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
  MessageCircle,
  MessageSquare,
  Send,
  Copy,
  ExternalLink,
  ShoppingBag,
  Tag,
  Zap,
  Plus,
  Sparkles,
  Star,
  ShieldCheck,
  Trash2,
  Eye,
  EyeOff,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign,
  FileSpreadsheet,
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

interface SupportTicket {
  id: string;
  whatsapp_phone_e164: string;
  order_id: string | null;
  message: string;
  status: "open" | "escalated" | "closed";
  created_at: string;
  order?: {
    id: string;
    order_number: number;
    status: string;
    total_kobo: number;
    customer: {
      name: string;
      email: string;
    };
  } | null;
}

interface AbandonedOrder {
  id: string;
  order_number: number;
  status: string;
  total_kobo: number;
  created_at: string;
  reminder_sent_at: string | null;
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
    line_total_kobo: number;
  }>;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "sales" | "notifications" | "tickets" | "abandoned" | "promotions" | "reviews">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [ticketFilter, setTicketFilter] = useState<string>("");
  const [abandonedFilter, setAbandonedFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Abandoned recovery state
  const [abandonedOrders, setAbandonedOrders] = useState<AbandonedOrder[]>([]);
  const [abandonedMetrics, setAbandonedMetrics] = useState({
    totalPendingOrAbandoned: 0,
    remindersSentCount: 0,
    recoveredCount: 0,
    recoveredRevenueKobo: 0,
    atRiskRevenueKobo: 0,
    recoveryRatePercent: 0,
  });
  const [runningSweep, setRunningSweep] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Dispatch Modal State
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [dispatchCourier, setDispatchCourier] = useState("GIG Logistics");
  const [dispatchTracking, setDispatchTracking] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Promotions & Flash Sales State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponStats, setCouponStats] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    totalRedemptions: 0,
    activeFlashSalesCount: 0,
  });
  const [flashSales, setFlashSales] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showCreateCouponModal, setShowCreateCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING">("PERCENTAGE");
  const [newCouponValue, setNewCouponValue] = useState<number>(10);
  const [newCouponMinSpendNaira, setNewCouponMinSpendNaira] = useState<number>(5000);
  const [newCouponSector, setNewCouponSector] = useState<string>("");
  const [newCouponDescription, setNewCouponDescription] = useState<string>("");
  const [newCouponLimit, setNewCouponLimit] = useState<string>("");
  const [submittingCoupon, setSubmittingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Customer Reviews & Moderation State
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [reviewMetrics, setReviewMetrics] = useState({
    totalReviews: 0,
    approvedCount: 0,
    pendingCount: 0,
    verifiedCount: 0,
    averageStoreRating: 5.0,
  });
  const [reviewFilter, setReviewFilter] = useState<"all" | "approved" | "pending">("all");
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [togglingReviewId, setTogglingReviewId] = useState<string | null>(null);
  const [adminPhotoZoom, setAdminPhotoZoom] = useState<string | null>(null);

  // Sales & Accounting Ledger State
  interface SectorBreakdownItem {
    id: string;
    name: string;
    slug: string;
    unitsSold: number;
    revenueKobo: number;
    orderCount: number;
    percentageShare: number;
  }

  interface SalesMetrics {
    grossRevenueKobo: number;
    deliveredRevenueKobo: number;
    inTransitRevenueKobo: number;
    awaitingFulfillmentRevenueKobo: number;
    abandonedRevenueKobo: number;
    returnedRevenueKobo: number;
    totalOrdersCount: number;
    paidOrdersCount: number;
    averageOrderValueKobo: number;
    totalUnitsSold: number;
  }

  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    grossRevenueKobo: 0,
    deliveredRevenueKobo: 0,
    inTransitRevenueKobo: 0,
    awaitingFulfillmentRevenueKobo: 0,
    abandonedRevenueKobo: 0,
    returnedRevenueKobo: 0,
    totalOrdersCount: 0,
    paidOrdersCount: 0,
    averageOrderValueKobo: 0,
    totalUnitsSold: 0,
  });
  const [salesSectorBreakdown, setSalesSectorBreakdown] = useState<SectorBreakdownItem[]>([]);
  const [salesSectors, setSalesSectors] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [salesPeriod, setSalesPeriod] = useState<"all" | "today" | "7d" | "30d" | "this_month" | "custom">("all");
  const [salesDateFrom, setSalesDateFrom] = useState<string>("");
  const [salesDateTo, setSalesDateTo] = useState<string>("");
  const [salesSectorFilter, setSalesSectorFilter] = useState<string>("all");
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>("all");
  const [salesSearchQuery, setSalesSearchQuery] = useState<string>("");
  const [salesLoading, setSalesLoading] = useState<boolean>(false);

  const fetchSalesData = async () => {
    setSalesLoading(true);
    try {
      const params = new URLSearchParams();
      const now = new Date();

      if (salesPeriod === "today") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        params.append("from", todayStart);
      } else if (salesPeriod === "7d") {
        const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        params.append("from", d7);
      } else if (salesPeriod === "30d") {
        const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        params.append("from", d30);
      } else if (salesPeriod === "this_month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        params.append("from", monthStart);
      } else if (salesPeriod === "custom") {
        if (salesDateFrom) params.append("from", salesDateFrom);
        if (salesDateTo) params.append("to", salesDateTo);
      }

      if (salesSectorFilter && salesSectorFilter !== "all") {
        params.append("sector", salesSectorFilter);
      }
      if (salesStatusFilter && salesStatusFilter !== "all") {
        params.append("status", salesStatusFilter);
      }

      const res = await fetch(`/api/admin/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setSalesMetrics(data.metrics);
        if (data.sectorBreakdown) setSalesSectorBreakdown(data.sectorBreakdown);
        if (data.sectors) setSalesSectors(data.sectors);
        if (data.orders) setSalesOrders(data.orders);
      }
    } catch (e) {
      console.error("Failed to fetch sales data:", e);
    } finally {
      setSalesLoading(false);
    }
  };

  const downloadSalesCsv = (type: "ledger" | "sector") => {
    const params = new URLSearchParams();
    const now = new Date();

    if (salesPeriod === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      params.append("from", todayStart);
    } else if (salesPeriod === "7d") {
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      params.append("from", d7);
    } else if (salesPeriod === "30d") {
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      params.append("from", d30);
    } else if (salesPeriod === "this_month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      params.append("from", monthStart);
    } else if (salesPeriod === "custom") {
      if (salesDateFrom) params.append("from", salesDateFrom);
      if (salesDateTo) params.append("to", salesDateTo);
    }

    if (salesSectorFilter && salesSectorFilter !== "all") {
      params.append("sector", salesSectorFilter);
    }
    if (salesStatusFilter && salesStatusFilter !== "all") {
      params.append("status", salesStatusFilter);
    }

    params.append("format", type === "sector" ? "sector_csv" : "csv");
    window.open(`/api/admin/sales?${params.toString()}`, "_blank");
  };

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

  const fetchTickets = async () => {
    try {
      const url = ticketFilter ? `/api/admin/tickets?status=${ticketFilter}` : "/api/admin/tickets";
      const res = await fetch(url);
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (e) {
      console.error("Failed fetching tickets:", e);
    }
  };

  const fetchAbandoned = async () => {
    try {
      const url = abandonedFilter ? `/api/admin/abandoned?filter=${abandonedFilter}` : "/api/admin/abandoned";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAbandonedOrders(data.orders);
        setAbandonedMetrics(data.metrics);
      }
    } catch (e) {
      console.error("Failed fetching abandoned orders:", e);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.success) {
        setCoupons(data.coupons);
        setFlashSales(data.flashSales);
        setCouponStats(data.stats);
      }
    } catch (e) {
      console.error("Failed fetching coupons:", e);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    if (!newCouponCode.trim()) {
      setCouponError("Please enter a valid coupon code");
      return;
    }
    setSubmittingCoupon(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCouponCode.trim().toUpperCase(),
          discountType: newCouponType,
          discountValue: Number(newCouponValue),
          minSpendKobo: Number(newCouponMinSpendNaira) * 100,
          sectorRestriction: newCouponSector || null,
          usageLimit: newCouponLimit ? Number(newCouponLimit) : null,
          description: newCouponDescription.trim() || `${newCouponCode} promotional discount`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateCouponModal(false);
        setNewCouponCode("");
        setNewCouponDescription("");
        setNewCouponLimit("");
        await fetchCoupons();
      } else {
        setCouponError(data.error || "Failed to create coupon");
      }
    } catch (err) {
      console.error("Failed to create coupon:", err);
      setCouponError("Network error while creating coupon");
    } finally {
      setSubmittingCoupon(false);
    }
  };

  const fetchAdminReviews = async () => {
    setLoadingReviews(true);
    try {
      const url = reviewFilter !== "all" ? `/api/admin/reviews?status=${reviewFilter}` : "/api/admin/reviews";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAdminReviews(data.reviews);
        setReviewMetrics(data.metrics);
      }
    } catch (e) {
      console.error("Failed fetching reviews:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleToggleReviewApproval = async (reviewId: string, currentApproval: boolean) => {
    setTogglingReviewId(reviewId);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, isApproved: !currentApproval }),
      });
      if (res.ok) {
        await fetchAdminReviews();
      }
    } catch (e) {
      console.error("Failed updating review approval:", e);
    } finally {
      setTogglingReviewId(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to permanently delete this customer review?")) return;
    try {
      const res = await fetch(`/api/admin/reviews?id=${reviewId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAdminReviews();
      }
    } catch (e) {
      console.error("Failed deleting review:", e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchAbandoned();
    fetchCoupons();
    fetchAdminReviews();
    if (activeTab === "sales") {
      fetchSalesData();
    }
    if (activeTab === "notifications") {
      fetchLogs();
    }
    if (activeTab === "tickets") {
      fetchTickets();
    }
    if (activeTab === "abandoned") {
      fetchAbandoned();
    }
    if (activeTab === "promotions") {
      fetchCoupons();
    }
    if (activeTab === "reviews") {
      fetchAdminReviews();
    }
  }, [
    statusFilter,
    ticketFilter,
    abandonedFilter,
    reviewFilter,
    activeTab,
    salesPeriod,
    salesDateFrom,
    salesDateTo,
    salesSectorFilter,
    salesStatusFilter,
  ]);

  const filteredSalesOrders = salesOrders.filter((o) => {
    if (!salesSearchQuery.trim()) return true;
    const q = salesSearchQuery.toLowerCase().trim();
    const orderNumMatch = String(o.order_number).includes(q);
    const nameMatch = o.customer?.name?.toLowerCase().includes(q) || false;
    const emailMatch = o.customer?.email?.toLowerCase().includes(q) || false;
    const phoneMatch = o.customer?.phone?.toLowerCase().includes(q) || false;
    const payRefMatch = o.payment?.paystack_reference?.toLowerCase().includes(q) || false;
    const invoiceMatch = o.invoice?.invoice_number ? String(o.invoice.invoice_number).includes(q) : false;
    const receiptMatch = o.receipt?.receipt_number ? String(o.receipt.receipt_number).includes(q) : false;
    return orderNumMatch || nameMatch || emailMatch || phoneMatch || payRefMatch || invoiceMatch || receiptMatch;
  });

  const handleRunSweep = async () => {
    setRunningSweep(true);
    try {
      const res = await fetch("/api/admin/abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sweep" }),
      });
      if (res.ok) {
        await fetchAbandoned();
      }
    } catch (e) {
      console.error("Failed running sweep:", e);
    } finally {
      setRunningSweep(false);
    }
  };

  const handleSendSingleReminder = async (orderId: string) => {
    setSendingReminderId(orderId);
    try {
      const res = await fetch("/api/admin/abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        await fetchAbandoned();
      }
    } catch (e) {
      console.error("Failed sending reminder:", e);
    } finally {
      setSendingReminderId(null);
    }
  };

  const copyResumeLink = (orderId: string) => {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${appUrl}/checkout/resume?order=${orderId}&code=SAVE5`;
    navigator.clipboard.writeText(url);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: newStatus }),
      });
      if (res.ok) {
        await fetchTickets();
      }
    } catch (e) {
      console.error("Failed updating ticket:", e);
    }
  };

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
              fetchAbandoned();
              if (activeTab === "sales") fetchSalesData();
              if (activeTab === "notifications") fetchLogs();
              if (activeTab === "tickets") fetchTickets();
              if (activeTab === "abandoned") fetchAbandoned();
              if (activeTab === "promotions") fetchCoupons();
              if (activeTab === "reviews") fetchAdminReviews();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || salesLoading ? "animate-spin" : ""}`} /> Refresh
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
      <div className="flex items-center gap-4 border-b border-slate-200 text-sm font-semibold flex-wrap">
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
          onClick={() => setActiveTab("sales")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "sales"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" /> Sales & Accounting
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
        <button
          onClick={() => setActiveTab("tickets")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "tickets"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <MessageCircle className="w-4 h-4" /> Support Tickets
          {tickets.filter((t) => t.status === "open").length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {tickets.filter((t) => t.status === "open").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("abandoned")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "abandoned"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Abandoned Recovery
          {abandonedMetrics.totalPendingOrAbandoned > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {abandonedMetrics.totalPendingOrAbandoned}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("promotions")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "promotions"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Tag className="w-4 h-4" /> Promotions & Coupons
          {couponStats.activeCoupons > 0 && (
            <span className="bg-pink-100 text-pink-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {couponStats.activeCoupons}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "reviews"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Customer Reviews ({reviewMetrics.totalReviews})
          {reviewMetrics.pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {reviewMetrics.pendingCount} pending
            </span>
          )}
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

      {/* Tab: Support Tickets */}
      {activeTab === "tickets" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
              {["", "open", "escalated", "closed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setTicketFilter(s)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                    ticketFilter === s
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s || "All"}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Live WhatsApp customer inquiries routed to support agents.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Ticket #</th>
                  <th className="p-3.5">Customer & WhatsApp</th>
                  <th className="p-3.5">Message / Inquiry</th>
                  <th className="p-3.5">Order</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No support tickets match the current filter.
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => {
                    const cleanPhone = ticket.whatsapp_phone_e164.replace(/\D/g, "");
                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold font-mono text-slate-900">
                          #{ticket.id.slice(-6).toUpperCase()}
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                            {new Date(ticket.created_at).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">
                            {ticket.order?.customer.name || "WhatsApp Guest"}
                          </div>
                          <div className="text-slate-600 font-mono text-[11px] mt-0.5">
                            {ticket.whatsapp_phone_e164}
                          </div>
                        </td>
                        <td className="p-3.5 max-w-sm">
                          <p className="text-slate-800 line-clamp-2">{ticket.message}</p>
                        </td>
                        <td className="p-3.5">
                          {ticket.order ? (
                            <div>
                              <span className="font-bold text-slate-900">#{ticket.order.order_number}</span>
                              <div className="text-[11px] text-slate-500">
                                {formatKoboToNaira(ticket.order.total_kobo)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">None linked</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ticket.status === "open"
                                ? "bg-amber-100 text-amber-800"
                                : ticket.status === "escalated"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                                `Hello, this is Aura Store support regarding Ticket #${ticket.id.slice(-6).toUpperCase()}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Reply
                            </a>

                            {ticket.status !== "closed" ? (
                              <button
                                onClick={() => handleUpdateTicketStatus(ticket.id, "closed")}
                                className="px-2 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                              >
                                Close
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateTicketStatus(ticket.id, "open")}
                                className="px-2 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                              >
                                Reopen
                              </button>
                            )}

                            {ticket.status === "open" && (
                              <button
                                onClick={() => handleUpdateTicketStatus(ticket.id, "escalated")}
                                className="px-2 py-1.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold"
                              >
                                Escalate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Abandoned Cart Recovery */}
      {activeTab === "abandoned" && (
        <div className="space-y-6">
          {/* Recovery Overview KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Rescued Revenue</span>
              <p className="text-lg font-bold text-emerald-600 mt-1">
                {formatKoboToNaira(abandonedMetrics.recoveredRevenueKobo)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Recovered Orders</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-slate-900">{abandonedMetrics.recoveredCount}</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {abandonedMetrics.recoveryRatePercent}% Rate
                </span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Unpaid Cart Value at Risk</span>
              <p className="text-lg font-bold text-amber-600 mt-1">
                {formatKoboToNaira(abandonedMetrics.atRiskRevenueKobo)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Reminders Dispatched</span>
              <p className="text-lg font-bold text-indigo-600 mt-1">{abandonedMetrics.remindersSentCount}</p>
            </div>
          </div>

          {/* Action Bar & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
              {["", "unreminded", "reminded", "recovered"].map((f) => (
                <button
                  key={f}
                  onClick={() => setAbandonedFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                    abandonedFilter === f
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f || "All Carts"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunSweep}
                disabled={runningSweep}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs"
              >
                {runningSweep ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sweeping Carts...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" /> Run Recovery Sweep Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table of Carts */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Order #</th>
                  <th className="p-3.5">Customer & WhatsApp</th>
                  <th className="p-3.5">Items in Cart</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Recovery Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {abandonedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No unpaid or abandoned checkouts found.
                    </td>
                  </tr>
                ) : (
                  abandonedOrders.map((ord) => {
                    const isPaid = ord.status === "paid" || ord.status === "shipped" || ord.status === "delivered";
                    const isReminded = ord.reminder_sent_at !== null;
                    const cleanPhone = (ord.customer.whatsapp_phone_e164 || ord.customer.phone || "").replace(/\D/g, "");

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold font-mono text-slate-900">
                          #{ord.order_number}
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                            {new Date(ord.created_at).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{ord.customer.name}</div>
                          <div className="text-slate-500 text-[11px]">{ord.customer.email}</div>
                          {ord.customer.whatsapp_opt_in && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                              <MessageCircle className="w-3 h-3" /> WhatsApp Opted In
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="space-y-0.5">
                            {ord.items.map((item, idx) => (
                              <div key={idx} className="text-slate-800 truncate">
                                {item.product_name_snapshot} <span className="text-slate-500">×{item.qty}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {formatKoboToNaira(ord.total_kobo)}
                        </td>
                        <td className="p-3.5">
                          {isPaid ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              Recovered & Paid
                            </span>
                          ) : isReminded ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800">
                              Reminder Sent
                            </span>
                          ) : ord.status === "abandoned" ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-800">
                              Abandoned
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                              Unpaid / Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            {!isPaid && (
                              <button
                                onClick={() => handleSendSingleReminder(ord.id)}
                                disabled={sendingReminderId === ord.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors"
                              >
                                {sendingReminderId === ord.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                Send Reminder
                              </button>
                            )}

                            <button
                              onClick={() => copyResumeLink(ord.id)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                              title="Copy 1-Click Checkout Resume Link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedOrderId === ord.id ? "Copied!" : "Copy Link"}
                            </button>

                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                                  `Hi ${ord.customer.name}! We noticed you started checking out Order #${ord.order_number}. Let us know if you need any help completing your purchase!`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-semibold transition-colors"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Promotions & Flash Sales */}
      {activeTab === "promotions" && (
        <div className="space-y-6">
          {/* Header with Create Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[10px] font-bold text-pink-700 uppercase tracking-wider mb-1">
                <Tag className="w-3 h-3 text-pink-600" /> Revenue & Conversion Incentives
              </div>
              <h3 className="text-base font-bold text-slate-900">Promotions, Coupons & Sector Flash Sales</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage promotional discount codes, minimum basket thresholds, and time-sensitive sector flash sales.
              </p>
            </div>
            <button
              onClick={() => setShowCreateCouponModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" /> Create Promo Code
            </button>
          </div>

          {/* Coupon KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Configured Coupons</span>
              <p className="text-lg font-bold text-slate-900 mt-1">{couponStats.totalCoupons}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Active Coupons</span>
              <p className="text-lg font-bold text-pink-600 mt-1">{couponStats.activeCoupons}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Total Redemptions</span>
              <p className="text-lg font-bold text-emerald-600 mt-1">{couponStats.totalRedemptions}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Active Flash Sales</span>
              <p className="text-lg font-bold text-amber-600 mt-1">{couponStats.activeFlashSalesCount}</p>
            </div>
          </div>

          {/* Active Flash Sales Spotlight */}
          {flashSales.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Sector Flash Sales
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {flashSales.map((sale) => (
                  <div
                    key={sale.id}
                    className={`p-4 rounded-xl bg-gradient-to-r ${sale.bannerBg} text-white shadow-xs relative overflow-hidden`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider text-yellow-200 mb-1">
                          {sale.sectorSlug}
                        </span>
                        <h5 className="font-bold text-sm leading-snug">{sale.title}</h5>
                        <p className="text-xs text-white/90 mt-1">
                          Incentive: <span className="font-bold">{sale.discountPercent}% OFF</span> with code{" "}
                          <span className="font-mono font-black bg-white/20 px-1.5 py-0.5 rounded">{sale.promoCode}</span>
                        </p>
                      </div>
                      <span className="text-[10px] bg-black/30 px-2 py-1 rounded-md whitespace-nowrap font-mono text-yellow-300 font-semibold">
                        Ends: {new Date(sale.endsAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coupons Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-pink-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Promotional Discount Coupons ({coupons.length})
                </h4>
              </div>
              {loadingCoupons && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="p-3.5">Code & Description</th>
                    <th className="p-3.5">Discount Value</th>
                    <th className="p-3.5">Min Spend</th>
                    <th className="p-3.5">Category Scope</th>
                    <th className="p-3.5">Redemptions</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No promotional coupons configured yet.
                      </td>
                    </tr>
                  ) : (
                    coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {c.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-xs">{c.description}</p>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {c.formattedDiscount ||
                            (c.discountType === "PERCENTAGE"
                              ? `${c.discountValue}%`
                              : c.discountType === "FIXED_AMOUNT"
                              ? formatKoboToNaira(c.discountValue)
                              : "Free Delivery")}
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {c.formattedMinSpend || formatKoboToNaira(c.minSpendKobo)}
                        </td>
                        <td className="p-3.5">
                          {c.sectorRestriction ? (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                              {c.sectorRestriction}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                              Storewide
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {c.timesUsed} {c.usageLimit ? `/ ${c.usageLimit}` : "uses"}
                        </td>
                        <td className="p-3.5">
                          {c.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              if (typeof navigator !== "undefined") {
                                navigator.clipboard.writeText(c.code);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                            title="Copy code"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
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

      {/* Create Coupon Modal */}
      {showCreateCouponModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create New Coupon Code</h3>
                  <p className="text-[11px] text-slate-500">Configure promotional discount rules</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateCouponModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {couponError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{couponError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FLASH20"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 uppercase focus:outline-hidden focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:border-slate-900"
                  >
                    <option value="PERCENTAGE">Percentage (%) Off</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (₦) Off</option>
                    <option value="FREE_SHIPPING">Free Courier Delivery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {newCouponType === "PERCENTAGE"
                      ? "Percentage Value (%) *"
                      : newCouponType === "FIXED_AMOUNT"
                      ? "Discount Amount (₦) *"
                      : "Free Delivery Waiver"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    disabled={newCouponType === "FREE_SHIPPING"}
                    value={newCouponType === "FREE_SHIPPING" ? 100 : newCouponValue}
                    onChange={(e) => setNewCouponValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-hidden focus:border-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Min Basket Spend (₦)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newCouponMinSpendNaira}
                    onChange={(e) => setNewCouponMinSpendNaira(Number(e.target.value))}
                    placeholder="5000"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sector Scope
                  </label>
                  <select
                    value={newCouponSector}
                    onChange={(e) => setNewCouponSector(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-slate-900"
                  >
                    <option value="">Storewide (All Categories)</option>
                    <option value="jewelry">Fine & Fashion Jewelry</option>
                    <option value="girly-essentials">Girly Essentials</option>
                    <option value="content-accessories">Content Accessories</option>
                    <option value="kitchen-souvenirs">Kitchen & Souvenirs</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Usage Limit (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newCouponLimit}
                    onChange={(e) => setNewCouponLimit(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Public Description
                </label>
                <input
                  type="text"
                  value={newCouponDescription}
                  onChange={(e) => setNewCouponDescription(e.target.value)}
                  placeholder="e.g. 10% off for first-time shoppers on orders over ₦5,000"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCouponModal(false)}
                  disabled={submittingCoupon}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCoupon}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 font-bold text-white transition-colors shadow-xs"
                >
                  {submittingCoupon ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <Tag className="w-3.5 h-3.5" /> Save Coupon
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Customer Reviews & Moderation */}
      {activeTab === "reviews" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Customer Social Proof & UGC
              </div>
              <h3 className="text-base font-bold text-slate-900">Product Reviews & Customer UGC Moderation</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review, verify, and moderate customer testimonials and uploaded product photos across all sectors.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAdminReviews}
                disabled={loadingReviews}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingReviews ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Total Reviews</span>
              <p className="text-lg font-bold text-slate-900 mt-1">{reviewMetrics.totalReviews}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Average Store Rating</span>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-lg font-bold text-amber-600">{reviewMetrics.averageStoreRating.toFixed(1)}</p>
                <div className="flex text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Verified Buyers</span>
              <p className="text-lg font-bold text-emerald-600 mt-1">
                {reviewMetrics.verifiedCount} ({reviewMetrics.totalReviews > 0 ? Math.round((reviewMetrics.verifiedCount / reviewMetrics.totalReviews) * 100) : 0}%)
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Approved Reviews</span>
              <p className="text-lg font-bold text-indigo-600 mt-1">{reviewMetrics.approvedCount}</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter:</span>
            <button
              onClick={() => setReviewFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                reviewFilter === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              All ({reviewMetrics.totalReviews})
            </button>
            <button
              onClick={() => setReviewFilter("approved")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                reviewFilter === "approved" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Approved ({reviewMetrics.approvedCount})
            </button>
            <button
              onClick={() => setReviewFilter("pending")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                reviewFilter === "pending" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Pending / Hidden ({reviewMetrics.pendingCount})
            </button>
          </div>

          {/* Reviews Moderation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Customer Testimonials ({adminReviews.length})
                </h4>
              </div>
              {loadingReviews && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Rating</th>
                    <th className="p-3.5">Review Feedback</th>
                    <th className="p-3.5">Photo UGC</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminReviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No customer reviews found.
                      </td>
                    </tr>
                  ) : (
                    adminReviews.map((rev) => (
                      <tr key={rev.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{rev.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{rev.customer_email}</div>
                          {rev.is_verified_buyer ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Buyer
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Store Guest</span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-[180px]">
                          <div className="font-semibold text-slate-900 truncate" title={rev.product.name}>
                            {rev.product.name}
                          </div>
                          <span className="text-[10px] uppercase font-bold text-pink-600">
                            {rev.product.sector.name}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 mt-0.5 block">
                            {rev.rating} / 5 Stars
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          {rev.headline && (
                            <div className="font-bold text-slate-900 truncate">{rev.headline}</div>
                          )}
                          <p className="text-[11px] text-slate-600 line-clamp-2">{rev.comment}</p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(rev.created_at).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })} · {rev.helpful_votes} helpful votes
                          </span>
                        </td>
                        <td className="p-3.5">
                          {rev.photo_url ? (
                            <button
                              type="button"
                              onClick={() => setAdminPhotoZoom(rev.photo_url)}
                              className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 block hover:scale-105 transition-transform"
                            >
                              <img src={rev.photo_url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[11px]">No photo</span>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {rev.is_approved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              Hidden
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={togglingReviewId === rev.id}
                              onClick={() => handleToggleReviewApproval(rev.id, rev.is_approved)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                rev.is_approved
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              }`}
                              title={rev.is_approved ? "Hide from Storefront" : "Approve & Publish"}
                            >
                              {rev.is_approved ? (
                                <>
                                  <EyeOff className="w-3 h-3" /> Hide
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" /> Approve
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(rev.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* Sales & Accounting Ledger Tab */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          {/* Sales Tab Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Sales Ledger & Financial Bookkeeping
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time transaction reconciliation, sector revenue attribution, and sequential invoice/receipt audits.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => downloadSalesCsv("sector")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <PieChart className="w-3.5 h-3.5 text-indigo-600" /> Sector Accounting CSV
              </button>
              <button
                type="button"
                onClick={() => downloadSalesCsv("ledger")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Master Sales CSV
              </button>
            </div>
          </div>

          {/* Time Period Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Accounting Period
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "7d", label: "Last 7 Days" },
                  { id: "30d", label: "Last 30 Days" },
                  { id: "this_month", label: "This Month" },
                  { id: "custom", label: "Custom Range" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSalesPeriod(p.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      salesPeriod === p.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range Inputs */}
            {salesPeriod === "custom" && (
              <div className="pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">From:</span>
                  <input
                    type="date"
                    value={salesDateFrom}
                    onChange={(e) => setSalesDateFrom(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">To:</span>
                  <input
                    type="date"
                    value={salesDateTo}
                    onChange={(e) => setSalesDateTo(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchSalesData}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold text-xs hover:bg-slate-800 transition-colors"
                >
                  Apply Date Range
                </button>
              </div>
            )}
          </div>

          {/* Financial KPI Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Confirmed Sales</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {formatKoboToNaira(salesMetrics.grossRevenueKobo)}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">
                {salesMetrics.paidOrdersCount} confirmed orders
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Average Order Value (AOV)</span>
              <p className="text-xl font-black text-indigo-600 mt-1">
                {formatKoboToNaira(salesMetrics.averageOrderValueKobo)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                Across confirmed transactions
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Items Sold</span>
              <p className="text-xl font-black text-emerald-600 mt-1">
                {salesMetrics.totalUnitsSold} <span className="text-xs font-normal text-slate-500">units</span>
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                Inventory moved
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Realized (Delivered)</span>
              <p className="text-xl font-black text-teal-600 mt-1">
                {formatKoboToNaira(salesMetrics.deliveredRevenueKobo)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                Fully fulfilled & received
              </span>
            </div>
          </div>

          {/* Secondary Revenue Distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500">In Transit (Dispatched)</span>
                <p className="text-base font-bold text-blue-600 mt-0.5">
                  {formatKoboToNaira(salesMetrics.inTransitRevenueKobo)}
                </p>
              </div>
              <Truck className="w-5 h-5 text-blue-400" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500">Awaiting Shipment</span>
                <p className="text-base font-bold text-amber-600 mt-0.5">
                  {formatKoboToNaira(salesMetrics.awaitingFulfillmentRevenueKobo)}
                </p>
              </div>
              <Package className="w-5 h-5 text-amber-400" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500">Lost / Abandoned Value</span>
                <p className="text-base font-bold text-rose-600 mt-0.5">
                  {formatKoboToNaira(salesMetrics.abandonedRevenueKobo)}
                </p>
              </div>
              <RotateCcw className="w-5 h-5 text-rose-400" />
            </div>
          </div>

          {/* Sector Revenue Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Revenue Contribution by Sector
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                4 Core Store Sectors
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {salesSectorBreakdown.map((sec) => (
                <div
                  key={sec.id}
                  className={`p-4 rounded-xl border transition-all ${
                    salesSectorFilter === sec.slug
                      ? "border-slate-900 bg-slate-50/80 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                      {sec.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSalesSectorFilter(salesSectorFilter === sec.slug ? "all" : sec.slug)
                      }
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      {salesSectorFilter === sec.slug ? "Clear" : "Filter"}
                    </button>
                  </div>
                  <p className="text-lg font-black text-slate-900 mt-2">
                    {formatKoboToNaira(sec.revenueKobo)}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{sec.unitsSold} units sold</span>
                      <span className="font-bold text-slate-700">{sec.percentageShare}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(sec.percentageShare, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Table Filter Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Order #, Customer, Paystack ref, Invoice #..."
                  value={salesSearchQuery}
                  onChange={(e) => setSalesSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={salesSectorFilter}
                  onChange={(e) => setSalesSectorFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Sectors</option>
                  {salesSectors.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={salesStatusFilter}
                  onChange={(e) => setSalesStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="abandoned">Abandoned</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="p-3.5">Order & Date</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Items & Sectors</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Gross (NGN)</th>
                    <th className="p-3.5 text-right">Official Documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                        Loading sales ledger transactions...
                      </td>
                    </tr>
                  ) : filteredSalesOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No transactions found matching current accounting filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">#{o.order_number}</div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(o.created_at).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          {o.payment?.paystack_reference && (
                            <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                              {o.payment.paystack_reference}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{o.customer?.name}</div>
                          <div className="text-[11px] text-slate-400">{o.customer?.email}</div>
                          <div className="text-[11px] text-slate-400">{o.customer?.phone}</div>
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <div className="space-y-1">
                            {o.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700 truncate">
                                <span className="font-bold text-slate-900">{item.qty}x</span>
                                <span className="truncate">{item.product_name_snapshot}</span>
                                {item.product?.sector?.name && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600 font-medium">
                                    {item.product.sector.name}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {o.status === "paid" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <CheckCircle className="w-3 h-3" /> Paid
                            </span>
                          )}
                          {o.status === "shipped" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Truck className="w-3 h-3" /> Shipped
                            </span>
                          )}
                          {o.status === "delivered" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Delivered
                            </span>
                          )}
                          {o.status === "abandoned" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="w-3 h-3" /> Abandoned
                            </span>
                          )}
                          {o.status === "returned" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <RotateCcw className="w-3 h-3" /> Returned
                            </span>
                          )}
                          {!["paid", "shipped", "delivered", "abandoned", "returned"].includes(o.status) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {o.status}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-bold text-slate-900">
                          {formatKoboToNaira(o.total_kobo)}
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap">
                          {["paid", "shipped", "delivered"].includes(o.status) ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`/api/orders/${o.id}/receipt?type=invoice`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                title="Download Official Invoice PDF"
                              >
                                <FileText className="w-3 h-3 text-slate-500" />
                                {o.invoice?.invoice_number ? `INV-${String(o.invoice.invoice_number).padStart(5, "0")}` : "Invoice"}
                              </a>

                              <a
                                href={`/api/orders/${o.id}/receipt?type=receipt`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                title="Download Official Receipt PDF"
                              >
                                <Download className="w-3 h-3 text-emerald-600" />
                                {o.receipt?.receipt_number ? `REC-${String(o.receipt.receipt_number).padStart(5, "0")}` : "Receipt"}
                              </a>

                              <a
                                href={`/api/orders/${o.id}/receipt?type=packing_slip`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                                title="Download Packing Slip PDF"
                              >
                                <Truck className="w-3 h-3 text-blue-600" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No documents</span>
                          )}
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

      {/* Admin Photo Zoom Modal */}
      {adminPhotoZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setAdminPhotoZoom(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] rounded-2xl overflow-hidden bg-black shadow-2xl">
            <button
              type="button"
              onClick={() => setAdminPhotoZoom(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={adminPhotoZoom}
              alt="Enlarged customer photo review"
              className="w-full h-full object-contain max-h-[80vh]"
            />
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
