"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  RefreshCw,
  Mail,
  Zap,
  TrendingUp,
  Percent,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Settings,
  Sparkles,
  ExternalLink,
  Search,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface CampaignItem {
  id: string;
  type: string;
  name: string;
  description: string;
  is_active: boolean;
  delay_days: number;
  discount_percentage: number;
  channel: "email" | "whatsapp";
  stats: {
    sent: number;
    opened: number;
    converted: number;
    revenue_kobo: number;
  };
}

interface CampaignLog {
  id: string;
  campaign_type: string;
  recipient_email: string;
  discount_code?: string;
  channel: string;
  subject: string;
  status: string;
  created_at: string;
  customer?: {
    name: string;
    email: string;
  };
}

export function AdminMarketingTab() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  // Test preview state
  const [selectedPreviewType, setSelectedPreviewType] = useState<string | null>(null);
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewSending, setPreviewSending] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<string | null>(null);

  // Editing state
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/marketing-campaigns");
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.campaigns);
        setLogs(data.recent_logs || []);
      }
    } catch (e) {
      console.error("Failed to load marketing campaigns", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleToggleActive = async (campaign: CampaignItem) => {
    try {
      setSavingId(campaign.id);
      const res = await fetch("/api/admin/marketing-campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: campaign.id,
          is_active: !campaign.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaign.id ? { ...c, is_active: !c.is_active } : c))
        );
      }
    } catch (e) {
      console.error("Failed to toggle campaign", e);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateSettings = async (
    id: string,
    delay_days: number,
    discount_percentage: number
  ) => {
    try {
      setSavingId(id);
      const res = await fetch("/api/admin/marketing-campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          delay_days,
          discount_percentage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, delay_days, discount_percentage } : c
          )
        );
      }
    } catch (e) {
      console.error("Failed to update campaign settings", e);
    } finally {
      setSavingId(null);
    }
  };

  const handleTriggerSweep = async () => {
    try {
      setSweeping(true);
      setSweepResult(null);
      const res = await fetch("/api/cron/marketing-drips", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setSweepResult(
          `Sweep completed! Dispatched ${data.summary.total_dispatched} messages (${data.summary.winback_dispatched} Win-back, ${data.summary.replenishment_dispatched} Replenishment, ${data.summary.vip_dispatched} VIP).`
        );
        fetchCampaigns();
      } else {
        setSweepResult(`Sweep failed: ${data.error}`);
      }
    } catch (e: any) {
      setSweepResult(`Sweep error: ${e.message}`);
    } finally {
      setSweeping(false);
    }
  };

  const handleSendTestPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPreviewType || !previewEmail) return;

    try {
      setPreviewSending(true);
      setPreviewStatus(null);
      const res = await fetch("/api/admin/marketing-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_type: selectedPreviewType,
          test_email: previewEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewStatus(`Dispatched preview with code: ${data.preview.discount_code}`);
        setTimeout(() => {
          setSelectedPreviewType(null);
          setPreviewEmail("");
          setPreviewStatus(null);
        }, 3000);
      } else {
        setPreviewStatus(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setPreviewStatus(`Error: ${e.message}`);
    } finally {
      setPreviewSending(false);
    }
  };

  // Compute overall stats
  const totalSent = campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
  const totalConverted = campaigns.reduce((acc, c) => acc + (c.stats?.converted || 0), 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + (c.stats?.revenue_kobo || 0), 0);
  const conversionRate = totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-pink-600 mb-3" />
        <p className="text-sm">Loading marketing campaign data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Manual Trigger */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-pink-500/20 text-pink-400 border border-pink-500/30">
              Retention & Growth
            </span>
            <span className="text-xs text-slate-400">Automated Lifecycle Drips</span>
          </div>
          <h2 className="text-xl font-black text-white">Marketing Automation Studio</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Autonomous win-back drips, product replenishment reminders, and VIP tier milestone credits designed to maximize customer lifetime value.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchCampaigns}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all text-xs font-semibold flex items-center gap-2"
            title="Refresh analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleTriggerSweep}
            disabled={sweeping}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {sweeping ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>{sweeping ? "Sweeping Drips..." : "Run Drip Sweep Now"}</span>
          </button>
        </div>
      </div>

      {sweepResult && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{sweepResult}</span>
        </div>
      )}

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Dispatched</span>
            <Send className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalSent}</div>
          <p className="text-xs text-slate-400 mt-1">Automated emails & notices</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Converted Orders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{totalConverted}</div>
          <p className="text-xs text-slate-400 mt-1">Purchases driven by drips</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{conversionRate}%</div>
          <p className="text-xs text-slate-400 mt-1">Incentive redemption rate</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Attributed Revenue</span>
            <Sparkles className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-black text-pink-600">{formatNaira(totalRevenue)}</div>
          <p className="text-xs text-slate-400 mt-1">Gross sales generated</p>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-pink-600" />
          <span>Active Lifecycle Sequences ({campaigns.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border transition-all p-6 bg-white shadow-sm flex flex-col justify-between ${
                c.is_active
                  ? "border-slate-200 ring-1 ring-slate-100"
                  : "border-slate-200/60 opacity-75 bg-slate-50/50"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        c.is_active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {c.is_active ? "Live Automated" : "Paused"}
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-1.5">{c.name}</h4>
                  </div>

                  <button
                    onClick={() => handleToggleActive(c)}
                    disabled={savingId === c.id}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      c.is_active ? "bg-pink-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        c.is_active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-5">{c.description}</p>

                {/* Configuration inputs */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 mb-5">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Delay (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      defaultValue={c.delay_days}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleUpdateSettings(c.id, val, c.discount_percentage);
                        }
                      }}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1 flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Discount %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={70}
                      defaultValue={c.discount_percentage}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleUpdateSettings(c.id, c.delay_days, val);
                        }
                      }}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Performance stats mini row */}
                <div className="grid grid-cols-3 gap-2 text-center py-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Sent</span>
                    <span className="font-bold text-slate-800">{c.stats?.sent || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Orders</span>
                    <span className="font-bold text-emerald-600">{c.stats?.converted || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Revenue</span>
                    <span className="font-bold text-slate-900">
                      {formatNaira(c.stats?.revenue_kobo || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Channel: <span className="font-semibold text-slate-700 capitalize">{c.channel}</span>
                </span>
                <button
                  onClick={() => setSelectedPreviewType(c.type)}
                  className="text-xs text-pink-600 hover:text-pink-700 font-bold flex items-center gap-1"
                >
                  <span>Test Preview</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Preview Modal */}
      {selectedPreviewType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Send Test Campaign Preview
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Dispatches a simulated marketing email with a mock discount code to your inbox.
            </p>

            <form onSubmit={handleSendTestPreview} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={previewEmail}
                  onChange={(e) => setPreviewEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none"
                />
              </div>

              {previewStatus && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    previewStatus.startsWith("Dispatched")
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {previewStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewType(null);
                    setPreviewStatus(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={previewSending || !previewEmail}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white transition-all disabled:opacity-50"
                >
                  {previewSending ? "Sending..." : "Send Test Preview"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Automated Drip Logs</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live audit trail of dispatched win-back and replenishment messages
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full">
            {logs.length} Recent
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No marketing drip emails dispatched yet. Click "Run Drip Sweep Now" above to process eligible customers.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Discount Code</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Dispatched At</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">
                        {log.customer?.name || "Customer"}
                      </div>
                      <div className="text-slate-400 text-[11px]">{log.recipient_email}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md text-[10px]">
                        {log.campaign_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {log.discount_code ? (
                        <code className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                          {log.discount_code}
                        </code>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 capitalize">{log.channel}</td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(log.created_at).toLocaleString("en-NG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
