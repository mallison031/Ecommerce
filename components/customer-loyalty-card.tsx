"use client";

import React, { useState, useEffect } from "react";
import { Award, Crown, Sparkles, TrendingUp, History, Lock, ChevronRight } from "lucide-react";

interface LoyaltyData {
  points: number;
  tier: {
    name: string;
    badgeColor: string;
    nextTier: string | null;
    pointsToNext: number;
    progressPercent: number;
    perks: string[];
  };
  redemptionStatus: string;
  redemptionNotice: string;
  ledger: Array<{
    id: string;
    points: number;
    reason: string;
    createdAt: string;
  }>;
}

interface CustomerLoyaltyCardProps {
  token?: string;
}

export function CustomerLoyaltyCard({ token }: CustomerLoyaltyCardProps) {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLoyalty() {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch("/api/customer/loyalty", { headers });
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed loading loyalty points:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLoyalty();
  }, [token]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="h-12 bg-slate-100 rounded mb-4" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black tracking-tight text-white">Aura Rewards Club</h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${data.tier.badgeColor}`}
              >
                {data.tier.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Earn exclusive VIP status and perks on every verified order
            </p>
          </div>
        </div>

        {/* Current Points Counter */}
        <div className="bg-slate-800/80 border border-slate-700 px-5 py-3 rounded-xl flex flex-col sm:items-end">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Total Balance
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-300">
            {data.points.toLocaleString()}{" "}
            <span className="text-sm font-semibold text-slate-300">Points</span>
          </div>
        </div>
      </div>

      {/* Progress to Next Tier Bar */}
      {data.tier.nextTier ? (
        <div className="mb-6 bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300">
              Next Tier: <strong className="text-white">{data.tier.nextTier}</strong>
            </span>
            <span className="font-semibold text-amber-400">
              {data.tier.pointsToNext.toLocaleString()} points needed
            </span>
          </div>
          <div className="w-full bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, data.tier.progressPercent))}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-2 text-xs text-amber-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>You have reached the highest tier — Platinum VIP! Enjoy all top benefits.</span>
        </div>
      )}

      {/* Tier Perks & Redemption Status Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Your Tier Benefits
          </span>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {data.tier.perks.map((perk, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Lock className="w-3.5 h-3.5" /> Rewards Redemption
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Points redemption is unlocking soon with VIP tier perks. Continue shopping to climb
              tiers and unlock exclusive rewards!
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automatic points credited on every purchase</span>
          </div>
        </div>
      </div>

      {/* Recent Points History Ledger */}
      {data.ledger.length > 0 && (
        <div className="border-t border-slate-700/60 pt-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Recent Points Activity</span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {data.ledger.map((item) => (
              <div
                key={item.id}
                className="bg-slate-800/60 border border-slate-700/40 rounded-lg p-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-white">{item.reason}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="font-bold text-amber-300 text-sm">+{item.points} pts</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default CustomerLoyaltyCard;
