"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  BellOff,
  Radio,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Volume2,
  VolumeX,
  FileSpreadsheet,
} from "lucide-react";

export interface LiveFeedEvent {
  id: string;
  type: "order_paid" | "order_created" | "order_delivered" | "return_requested" | "review_submitted" | "low_stock";
  title: string;
  description: string;
  timestamp: string;
  amountKobo?: number;
  badge: "paid" | "return" | "review" | "warning" | "info";
  linkTab: string;
}

interface LiveFeedSummary {
  todayOrdersCount: number;
  todayRevenueKobo: number;
  todayRevenueFormatted: string;
  pendingDispatchesCount: number;
  pendingReturnsCount: number;
  lowStockCount: number;
}

interface AdminLiveFeedBannerProps {
  onSelectTab: (tab: string) => void;
  onOpenSettlement: () => void;
}

export function AdminLiveFeedBanner({ onSelectTab, onOpenSettlement }: AdminLiveFeedBannerProps) {
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);
  const [summary, setSummary] = useState<LiveFeedSummary | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [latestToast, setLatestToast] = useState<LiveFeedEvent | null>(null);

  const knownEventIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef<boolean>(true);

  // Initialize sound preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("admin_chime_enabled");
      if (stored !== null) {
        setSoundEnabled(stored === "true");
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem("admin_chime_enabled", String(next));
      if (next) {
        playTwoToneBell();
      }
    } catch {}
  };

  // Synthesize a pleasant two-tone chime (587Hz -> 880Hz) via Web Audio API without any external asset loading
  const playTwoToneBell = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: A5 (880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (e) {
      console.warn("Audio chime prevented by browser:", e);
    }
  };

  const pollFeed = async () => {
    try {
      const res = await fetch("/api/admin/live-feed?limit=25");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      setSummary(data.summary);
      const incomingEvents: LiveFeedEvent[] = data.events || [];
      setEvents(incomingEvents);

      if (initialLoadRef.current) {
        // Record existing IDs without ringing on initial load
        incomingEvents.forEach((ev) => knownEventIdsRef.current.add(ev.id));
        initialLoadRef.current = false;
      } else {
        // Check for brand new events
        const brandNewEvents = incomingEvents.filter((ev) => !knownEventIdsRef.current.has(ev.id));
        if (brandNewEvents.length > 0) {
          // Register them
          brandNewEvents.forEach((ev) => knownEventIdsRef.current.add(ev.id));

          // Trigger sound if unmuted
          if (soundEnabled) {
            playTwoToneBell();
          }

          // Trigger toast with the newest event
          const newest = brandNewEvents[0];
          setLatestToast(newest);
          setTimeout(() => {
            setLatestToast((current) => (current?.id === newest.id ? null : current));
          }, 6000);
        }
      }
    } catch (err) {
      console.error("Live feed poll error:", err);
    }
  };

  useEffect(() => {
    pollFeed();
    const interval = setInterval(pollFeed, 12000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const getEventIcon = (type: LiveFeedEvent["type"]) => {
    switch (type) {
      case "order_paid":
      case "order_created":
      case "order_delivered":
        return <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />;
      case "return_requested":
        return <RotateCcw className="w-3.5 h-3.5 text-rose-600" />;
      case "review_submitted":
        return <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />;
      case "low_stock":
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <>
      {/* Live Bar Container */}
      <div className="bg-slate-900 text-slate-100 rounded-xl px-4 py-2.5 shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Live indicator & Today Revenue summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold tracking-wider uppercase text-[11px] text-emerald-400">
              Live Feed
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-4 text-slate-300">
            <div>
              Today:{" "}
              <span className="font-bold text-white">
                {summary ? summary.todayRevenueFormatted : "₦0"}
              </span>{" "}
              <span className="text-slate-400">
                ({summary?.todayOrdersCount || 0} order{summary?.todayOrdersCount === 1 ? "" : "s"})
              </span>
            </div>

            {summary && summary.pendingReturnsCount > 0 && (
              <button
                onClick={() => onSelectTab("returns")}
                className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                {summary.pendingReturnsCount} RMA Return{summary.pendingReturnsCount > 1 ? "s" : ""}
              </button>
            )}

            {summary && summary.lowStockCount > 0 && (
              <button
                onClick={() => onSelectTab("inventory")}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <AlertTriangle className="w-3 h-3" />
                {summary.lowStockCount} Low Stock
              </button>
            )}
          </div>
        </div>

        {/* Right: Sound toggle, Settlement modal trigger, Expand activity drawer */}
        <div className="flex items-center gap-2">
          {/* Sound Chime Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border transition-all ${
              soundEnabled
                ? "bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700"
                : "bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
            title={soundEnabled ? "Live Chime: ON (click to mute)" : "Live Chime: MUTED (click to enable)"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Daily Settlement Reconciliation */}
          <button
            onClick={onOpenSettlement}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Daily Settlement</span>
          </button>

          {/* Toggle Activity Drawer */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium transition-colors"
          >
            <span>Activity ({events.length})</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Live Activity Drawer */}
      {isExpanded && (
        <div className="mt-2 bg-white border border-slate-200 rounded-xl p-4 shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Real-Time Activity Stream
            </h4>
            <span className="text-[10px] text-slate-400">Updates automatically every 12s</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {events.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No recent activity logged.</p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onSelectTab(ev.linkTab)}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-md bg-slate-100 mt-0.5 shrink-0">
                      {getEventIcon(ev.type)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{ev.title}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{ev.description}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Real-time Toast Pop-up when new order/return occurs */}
      {latestToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-in slide-in-from-bottom-4">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
            {getEventIcon(latestToast.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white truncate">{latestToast.title}</span>
              <button
                onClick={() => setLatestToast(null)}
                className="text-slate-400 hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{latestToast.description}</p>
            <button
              onClick={() => {
                onSelectTab(latestToast.linkTab);
                setLatestToast(null);
              }}
              className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold uppercase tracking-wider"
            >
              View in {latestToast.linkTab} &rarr;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
export default AdminLiveFeedBanner;
