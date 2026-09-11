"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Package,
  MapPin,
  Heart,
  Settings,
  LogOut,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  Download,
  RotateCcw,
  Plus,
  Trash2,
  Phone,
  Mail,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  ExternalLink,
  Bell,
  Check,
  X,
  RefreshCcw,
  CornerDownLeft,
  Upload,
  Image as ImageIcon,
  Copy,
  Sparkles,
} from "lucide-react";
import { formatKoboToNaira } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import CustomerReturnsView from "@/components/customer-returns-view";
import ReturnRequestModal from "@/components/return-request-modal";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];

interface CustomerAddress {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  street_address: string;
  city?: string | null;
  state: string;
  lga?: string | null;
  is_default: boolean;
}

interface OrderItem {
  id: string;
  product_name_snapshot: string;
  unit_price_kobo_snapshot: number;
  qty: number;
  line_total_kobo: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    image_urls: string[];
    price_kobo: number;
    stock_qty: number;
    sector: { slug: string; name: string };
  } | null;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  total_kobo: number;
  delivery_address: string;
  courier_name?: string | null;
  tracking_number?: string | null;
  created_at: string;
  items: OrderItem[];
  invoice?: { invoice_number: number } | null;
  receipt?: { receipt_number: number } | null;
  return_requests?: any[];
}

function AccountPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCart();

  // Auth & Profile State
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [waitlists, setWaitlists] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalOrders: 0,
    activeOrdersCount: 0,
    deliveredOrdersCount: 0,
    totalSpentKobo: 0,
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "saved" | "settings" | "returns">("orders");
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null);
  const [returnBanner, setReturnBanner] = useState<string | null>(null);

  // Sign-in Form State
  const [authStep, setAuthStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    recipient_name: "",
    phone: "",
    street_address: "",
    state: "Lagos",
    lga: "",
    is_default: true,
  });

  // Settings State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Reorder notification banner
  const [reorderBanner, setReorderBanner] = useState<string | null>(null);

  // Fetch full customer profile
  const fetchProfile = async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/customer/profile");
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setOrders(data.orders || []);
        setAddresses(data.addresses || []);
        setWaitlists(data.waitlists || []);
        setReturnRequests(data.return_requests || []);
        setStats(data.stats || {});
        setEditName(data.customer.name || "");
        setEditPhone(data.customer.phone || "");
        setEditWhatsapp(data.customer.whatsapp_opt_in ?? true);
      } else {
        setCustomer(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setCustomer(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/customer/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput,
          name: nameInput,
          phone: phoneInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Failed to send verification code.");
      } else {
        setAuthStep("otp");
        setAuthSuccessMessage(data.message);
        // Pre-fill OTP in test environments if returned
        if (data.otp) setOtpInput(data.otp);
      }
    } catch (err) {
      setAuthError("Network error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/customer/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput,
          code: otpInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Invalid verification code.");
      } else {
        await fetchProfile();
      }
    } catch (err) {
      setAuthError("Network error verifying code.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/customer/auth/logout", { method: "POST" });
      setCustomer(null);
      setAuthStep("email");
      setOtpInput("");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // 1-Click Reorder
  const handleReorder = async (orderId: string, orderNumber: number) => {
    try {
      const res = await fetch(`/api/customer/reorder/${orderId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.reorderItems) {
        let addedCount = 0;
        data.reorderItems.forEach((item: any) => {
          addItem(
            {
              productId: item.productId,
              name: item.name,
              slug: item.slug,
              priceKobo: item.priceKobo,
              imageUrl: item.imageUrl,
            },
            item.qty
          );
          addedCount += item.qty;
        });

        setReorderBanner(
          `Added ${addedCount} item(s) from Order #${orderNumber} directly to your cart!`
        );
        setTimeout(() => setReorderBanner(null), 6000);
      }
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  // Add Address Submit
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSubmitting(true);
    setAddressError(null);
    try {
      const res = await fetch("/api/customer/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddressError(data.error || "Failed to save address.");
      } else {
        setAddressModalOpen(false);
        setNewAddress({
          label: "Home",
          recipient_name: customer?.name || "",
          phone: customer?.phone || "",
          street_address: "",
          state: "Lagos",
          lga: "",
          is_default: false,
        });
        await fetchProfile();
      }
    } catch (err) {
      setAddressError("Network error saving address.");
    } finally {
      setAddressSubmitting(false);
    }
  };

  // Set Address Default
  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      await fetch(`/api/customer/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      await fetchProfile();
    } catch (err) {
      console.error("Failed setting default address:", err);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to remove this delivery address?")) return;
    try {
      await fetch(`/api/customer/addresses/${addressId}`, { method: "DELETE" });
      await fetchProfile();
    } catch (err) {
      console.error("Failed deleting address:", err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          whatsapp_opt_in: editWhatsapp,
        }),
      });
      if (res.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
        await fetchProfile();
      }
    } catch (err) {
      console.error("Failed saving settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-pink-600 mb-3" />
        <p className="text-xs font-semibold text-slate-500">Accessing customer account...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW A: SIGN IN / OTP VERIFICATION FORM
  // ==========================================
  if (!customer) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 mx-auto">
              <User className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Customer Account
            </h1>
            <p className="text-xs text-slate-500">
              Sign in to view your order history, track shipments, and re-order your favorite essentials in 1 click.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{authSuccessMessage}</span>
            </div>
          )}

          {authStep === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-pink-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your.name@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Amina Adeleke"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-pink-500 transition-colors"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-500 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  No password needed. We will send a secure 6-digit one-time code to verify your identity.
                </span>
              </div>

              <button
                type="submit"
                disabled={authLoading || !emailInput.trim()}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending Code...
                  </>
                ) : (
                  <>
                    Continue with One-Time Code <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Enter 6-Digit Code
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep("email");
                      setOtpInput("");
                    }}
                    className="text-[11px] text-pink-600 font-semibold hover:underline"
                  >
                    Change email
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-mono font-black tracking-widest text-slate-900 focus:outline-hidden focus:bg-white focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading || otpInput.length < 6}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Sign In & Access Account <CheckCircle className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={authLoading}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Didn&apos;t receive a code? <span className="text-pink-600">Resend code</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW B: AUTHENTICATED CUSTOMER DASHBOARD
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1-Click Reorder Success Banner */}
      {reorderBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3 text-xs font-bold text-emerald-800">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{reorderBanner}</span>
          </div>
          <Link
            href="/cart"
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors"
          >
            View Cart &rarr;
          </Link>
        </div>
      )}

      {/* Return Request Banner */}
      {returnBanner && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3 text-xs font-bold text-purple-900">
            <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
            <span>{returnBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("returns")}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shrink-0 transition-colors"
          >
            Track RMA &rarr;
          </button>
        </div>
      )}

      {/* Customer Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-pink-100 text-pink-700 font-black text-xl flex items-center justify-center border border-pink-200 shrink-0">
              {customer.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome back, {customer.name || "Valued Shopper"}!
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                </span>
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}
                  </span>
                )}
                <span className="text-slate-300">&bull;</span>
                <span>
                  Member since {new Date(customer.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Account KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-pink-600" /> Total Orders
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {stats.totalOrders || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Orders placed to date</div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/60">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" /> In Transit
            </div>
            <div className="text-2xl font-black text-blue-700 mt-2">
              {stats.activeOrdersCount || 0}
            </div>
            <div className="text-[11px] text-blue-800/80 mt-0.5">Processing & shipped</div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Delivered
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2">
              {stats.deliveredOrdersCount || 0}
            </div>
            <div className="text-[11px] text-emerald-800/80 mt-0.5">Completed orders</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" /> Total Spent
            </div>
            <div className="text-xl font-black text-amber-800 mt-2 truncate">
              {formatKoboToNaira(stats.totalSpentKobo || 0)}
            </div>
            <div className="text-[11px] text-amber-800/80 mt-0.5">Across all sectors</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all shrink-0 ${
            activeTab === "orders"
              ? "border-pink-600 text-pink-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Package className="w-4 h-4" /> My Orders ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("returns")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all shrink-0 ${
            activeTab === "returns"
              ? "border-pink-600 text-pink-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <RefreshCcw className="w-4 h-4" /> Returns & Refunds ({returnRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("addresses")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all shrink-0 ${
            activeTab === "addresses"
              ? "border-pink-600 text-pink-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <MapPin className="w-4 h-4" /> Saved Delivery Addresses ({addresses.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all shrink-0 ${
            activeTab === "saved"
              ? "border-pink-600 text-pink-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Bell className="w-4 h-4" /> Waitlists & Wishlist
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all shrink-0 ${
            activeTab === "settings"
              ? "border-pink-600 text-pink-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Settings className="w-4 h-4" /> Profile & Notification Preferences
        </button>
      </div>

      {/* ==========================================
          TAB 1: ORDERS & 1-CLICK REORDER
      ========================================== */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No orders yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You haven&apos;t placed any orders with this account yet. Explore our curated collections to get started.
              </p>
              <div className="pt-2">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Start Shopping &rarr;
                </Link>
              </div>
            </div>
          ) : (
            orders.map((order) => {
              const statusColor =
                order.status === "delivered"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : order.status === "shipped"
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                  : order.status === "paid" || order.status === "processing"
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200";

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
                >
                  {/* Order Card Header */}
                  <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900">
                        Order #{order.order_number}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border ${statusColor}`}>
                        {order.status.replace("_", " ")}
                      </span>
                      <span className="text-slate-400">
                        {new Date(order.created_at).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      {order.return_requests?.map((rma: any) => (
                        <span
                          key={rma.id}
                          className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] bg-purple-100 text-purple-800 border border-purple-300"
                        >
                          {rma.rma_number}: {rma.status.replace("_", " ")}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 1-Click Reorder */}
                      <button
                        type="button"
                        onClick={() => handleReorder(order.id, order.order_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> 1-Click Re-order
                      </button>

                      {/* Track Order */}
                      <Link
                        href={`/track-order?orderId=ORD-${order.order_number}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5 text-slate-500" /> Track
                      </Link>

                      {/* Official Receipt */}
                      <a
                        href={`/api/orders/${order.id}/receipt?type=receipt`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors"
                        title="Download Receipt PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" /> Receipt
                      </a>

                      {/* Official Invoice */}
                      <a
                        href={`/api/orders/${order.id}/receipt?type=invoice`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                        title="Download Invoice PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" /> Invoice
                      </a>

                      {/* Request Return / Refund */}
                      {(order.status === "delivered" || order.status === "paid") && (
                        <button
                          type="button"
                          onClick={() => setReturnModalOrder(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition-colors"
                          title="Request Return or Refund"
                        >
                          <CornerDownLeft className="w-3.5 h-3.5 text-purple-600" /> Return
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Items List */}
                  <div className="p-4 sm:p-5 divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {item.product?.image_urls && item.product.image_urls[0] ? (
                            <img
                              src={item.product.image_urls[0]}
                              alt={item.product_name_snapshot}
                              className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {item.product ? (
                                <Link
                                  href={`/${item.product.sector?.slug || "products"}/${item.product.slug}`}
                                  className="hover:text-pink-600 transition-colors"
                                >
                                  {item.product_name_snapshot}
                                </Link>
                              ) : (
                                item.product_name_snapshot
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Qty: {item.qty} &times; {formatKoboToNaira(item.unit_price_kobo_snapshot)}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-bold text-slate-900 shrink-0">
                          {formatKoboToNaira(item.line_total_kobo)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer with Address & Total */}
                  <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-md">{order.delivery_address}</span>
                      {order.courier_name && (
                        <span className="font-semibold text-slate-700">
                          &bull; via {order.courier_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span>Total Paid:</span>
                      <span className="font-black text-sm text-slate-900">
                        {formatKoboToNaira(order.total_kobo)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==========================================
          TAB 2: SAVED DELIVERY ADDRESSES
      ========================================== */}
      {activeTab === "addresses" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saved Delivery Addresses</h2>
              <p className="text-xs text-slate-500">
                Speed up your checkout by saving your home, office, and pickup locations across Nigeria.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAddressModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add New Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
              <MapPin className="w-8 h-8 mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-900">No saved delivery addresses</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add an address to automatically pre-fill your delivery details during checkout.
              </p>
              <button
                type="button"
                onClick={() => setAddressModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-5 rounded-2xl border transition-all bg-white relative flex flex-col justify-between ${
                    addr.is_default
                      ? "border-pink-500 ring-2 ring-pink-100 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {addr.label || "Home"}
                      </span>
                      {addr.is_default && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Default Address
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-bold text-slate-900">
                      {addr.recipient_name}
                    </div>

                    <div className="text-xs text-slate-600 leading-relaxed">
                      {addr.street_address}
                      {addr.lga ? `, ${addr.lga}` : ""}
                      {addr.city ? `, ${addr.city}` : ""}
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {addr.state}, Nigeria
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {addr.phone}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                    {!addr.is_default ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-pink-600 hover:text-pink-700 font-semibold"
                      >
                        Set as Default
                      </button>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Primary delivery address</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Delete Address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: WAITLISTS & WISHLIST
      ========================================== */}
      {activeTab === "saved" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Wishlist & Favorites</h2>
              <p className="text-xs text-slate-500">
                Products you have bookmarked across all sectors.
              </p>
            </div>
            <Link
              href="/wishlist"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Open Full Wishlist Page &rarr;
            </Link>
          </div>

          {/* Active Back in Stock Waitlists */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" /> Back-in-Stock Notifications
            </h3>
            <p className="text-xs text-slate-500">
              You will automatically receive email & WhatsApp alerts the moment these products are restocked in our warehouse.
            </p>

            {waitlists.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                You are not on any product restock waitlists right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {waitlists.map((w) => (
                  <div key={w.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {w.product?.image_urls && w.product.image_urls[0] ? (
                        <img
                          src={w.product.image_urls[0]}
                          alt={w.product.name}
                          className="w-11 h-11 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          <Link
                            href={`/${w.product?.sector?.slug || "products"}/${w.product?.slug}`}
                            className="hover:text-pink-600 transition-colors"
                          >
                            {w.product?.name}
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatKoboToNaira(w.product?.price_kobo || 0)} &bull; Subscribed on{" "}
                          {new Date(w.created_at).toLocaleDateString("en-NG")}
                        </div>
                      </div>
                    </div>

                    <div>
                      {w.notified ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Restocked & Notified
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Awaiting Restock
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: PROFILE & NOTIFICATION PREFERENCES
      ========================================== */}
      {activeTab === "settings" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs max-w-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Profile & Notification Settings</h2>
            <p className="text-xs text-slate-500">
              Update your personal details and decide how you receive courier updates and receipts.
            </p>
          </div>

          {settingsSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your profile and preferences have been updated!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={customer.email}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400">
                Email address is linked to your account identity.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-pink-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-pink-600 focus:ring-pink-500 border-slate-300"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    WhatsApp Order Notifications
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Receive immediate dispatch alerts, courier tracking numbers, and delivery confirmation directly on WhatsApp.
                  </div>
                </div>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          TAB 5: RETURNS & REFUND REQUESTS
      ========================================== */}
      {activeTab === "returns" && (
        <CustomerReturnsView
          returns={returnRequests}
          onRefresh={fetchProfile}
          onStartReturn={() => setActiveTab("orders")}
        />
      )}

      {/* ==========================================
          RETURN REQUEST MODAL
      ========================================== */}
      <ReturnRequestModal
        order={returnModalOrder}
        isOpen={!!returnModalOrder}
        onClose={() => setReturnModalOrder(null)}
        onSuccess={(createdRma) => {
          fetchProfile();
          setActiveTab("returns");
          setReturnBanner(`Return request #${createdRma?.rma_number} submitted successfully!`);
          setTimeout(() => setReturnBanner(null), 6000);
        }}
      />

      {/* ==========================================
          ADD ADDRESS MODAL
      ========================================== */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setAddressModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Add Delivery Address</h3>
                <p className="text-xs text-slate-500">Save an address for quick nationwide delivery</p>
              </div>
            </div>

            {addressError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addressError}</span>
              </div>
            )}

            <form onSubmit={handleAddAddress} className="mt-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Address Label
                  </label>
                  <select
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Store/Pickup">Store/Pickup</option>
                    <option value="Family">Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    State (Nigeria) *
                  </label>
                  <select
                    required
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tunde Balogun"
                  value={newAddress.recipient_name}
                  onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Recipient Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="08031234567"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Street Address (House No, Street, Landmark) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                  value={newAddress.street_address}
                  onChange={(e) => setNewAddress({ ...newAddress, street_address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  LGA / City (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eti-Osa / Ikeja"
                  value={newAddress.lga}
                  onChange={(e) => setNewAddress({ ...newAddress, lga: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAddress.is_default}
                    onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                    className="w-4 h-4 rounded text-pink-600"
                  />
                  <span className="font-semibold text-slate-700">Set as my default delivery address</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressSubmitting}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-2"
                >
                  {addressSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Address"
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

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-pink-600 mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading your account...</p>
        </div>
      }
    >
      <AccountPortalContent />
    </Suspense>
  );
}
