"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Sliders,
  ExternalLink,
} from "lucide-react";

interface PreferencesState {
  marketing_emails_opt_in: boolean;
  marketing_whatsapp_opt_in: boolean;
  replenishment_opt_in: boolean;
  whatsapp_opt_in: boolean;
  unsubscribe_token?: string;
  email?: string;
  phone?: string;
}

export function CustomerPreferencesTab() {
  const [prefs, setPrefs] = useState<PreferencesState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customer/preferences");
      const data = await res.json();
      if (data.success) {
        setPrefs(data.preferences);
      }
    } catch (e) {
      console.error("Failed to load preferences", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleToggle = async (key: keyof PreferencesState) => {
    if (!prefs) return;
    const nextVal = !prefs[key];
    const updated = { ...prefs, [key]: nextVal };
    setPrefs(updated);

    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/customer/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [key]: nextVal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          text: "Your communication preferences have been saved.",
          type: "success",
        });
      } else {
        setMessage({ text: data.error || "Failed to update preferences", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: e.message || "Failed to update preferences", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-pink-500 mb-3" />
        <p className="text-sm">Loading your preferences...</p>
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Could not load notification preferences. Please try logging in again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700 text-white shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center gap-1">
            <Sliders className="w-3 h-3" /> Control Center
          </span>
        </div>
        <h2 className="text-xl font-black">Communication & Privacy Preferences</h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
          Customize how and when we reach you. We value your inbox and never send unsolicited spam.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-center gap-3 transition-all ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Preferences Cards */}
      <div className="space-y-4">
        {/* Marketing Emails */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Promotional Offers & Win-Back Discounts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Receive curated seasonal sales, personalized discount vouchers, and special promotions via email.
              </p>
              <div className="text-[11px] text-slate-400 mt-2">
                Delivered to: <span className="font-semibold text-slate-700">{prefs.email}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleToggle("marketing_emails_opt_in")}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              prefs.marketing_emails_opt_in ? "bg-pink-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.marketing_emails_opt_in ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* WhatsApp Promotions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                WhatsApp Flash Sale & VIP Drop Alerts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Instant WhatsApp alerts when limited-run stock drops or when you unlock high-tier VIP vouchers.
              </p>
              <div className="text-[11px] text-slate-400 mt-2">
                Sent to WhatsApp:{" "}
                <span className="font-semibold text-slate-700">
                  {prefs.phone || "No phone linked"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleToggle("marketing_whatsapp_opt_in")}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              prefs.marketing_whatsapp_opt_in ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.marketing_whatsapp_opt_in ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Replenishment Check-in */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Product Replenishment & Reorder Reminders
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Timely 30-day care check-ins and replenishment reminders for your favorite repeat essentials.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleToggle("replenishment_opt_in")}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              prefs.replenishment_opt_in ? "bg-pink-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.replenishment_opt_in ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Order Status Notifications */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Transactional WhatsApp Order Tracking
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Live dispatch, courier assignment, and real-time delivery milestones sent straight to your WhatsApp.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleToggle("whatsapp_opt_in")}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              prefs.whatsapp_opt_in ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.whatsapp_opt_in ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Privacy Notice & 1-Click Unsubscribe Link */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Compliant with Nigeria Data Protection Regulation (NDPR). You can unsubscribe at any time.
          </span>
        </div>
        {prefs.unsubscribe_token && (
          <a
            href={`/api/customer/unsubscribe?token=${prefs.unsubscribe_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-red-600 font-semibold underline shrink-0 transition-colors flex items-center gap-1"
          >
            <span>1-Click Full Unsubscribe</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
