"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Share2, Users, Gift, Sparkles } from "lucide-react";

interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferredCount: number;
  convertedOrdersCount: number;
  totalPointsEarned: number;
  rewardPerReferral: number;
  friends: Array<{
    id: string;
    name: string;
    joinedAt: string;
    hasOrdered: boolean;
  }>;
}

export function CustomerReferralCard({ sessionToken }: { sessionToken?: string }) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadReferrals() {
      const token = sessionToken || (typeof window !== "undefined" ? localStorage.getItem("customer_session_token") : null);
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/customer/referrals", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data) {
          setStats(data.data);
        }
      } catch (err) {
        console.error("Failed loading referral stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadReferrals();
  }, [sessionToken]);

  const handleCopy = () => {
    if (!stats?.referralLink) return;
    navigator.clipboard.writeText(stats.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!stats?.referralLink) return;
    const text = `Hey! Check out this amazing store. Use my link to get special perks on your first order: ${stats.referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-10 w-full bg-slate-100 rounded"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-400/30">
            <Gift className="w-3.5 h-3.5" /> Refer & Earn Rewards
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Give ₦1,000 Off, Get 500 Points</h3>
          <p className="text-sm text-slate-300 mt-1 max-w-lg">
            Invite your friends to shop. When they place their first order, they receive a special welcome perk and you instantly earn 500 loyalty rewards points!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3 px-5 text-center border border-white/10">
            <span className="text-xs text-indigo-200 uppercase font-medium block">Points Earned</span>
            <span className="text-2xl font-extrabold text-amber-300">+{stats.totalPointsEarned}</span>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3 px-5 text-center border border-white/10">
            <span className="text-xs text-indigo-200 uppercase font-medium block">Friends Invited</span>
            <span className="text-2xl font-extrabold text-white">{stats.totalReferredCount}</span>
          </div>
        </div>
      </div>

      {/* Share Box */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 mb-6">
        <label className="text-xs font-semibold uppercase text-indigo-200 tracking-wider block mb-2">
          Your Exclusive Referral Link
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-slate-200 truncate select-all">
            {stats.referralLink}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Or share your unique code:{" "}
          <strong className="text-white font-mono">{stats.referralCode}</strong>
        </div>
      </div>

      {/* Friends list */}
      {stats.friends.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-indigo-200 tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Recent Referrals ({stats.friends.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {stats.friends.slice(0, 6).map((friend) => (
              <div
                key={friend.id}
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white">{friend.name}</div>
                  <div className="text-[11px] text-slate-400">
                    Joined {new Date(friend.joinedAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  {friend.hasOrdered ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Ordered (+500 pts)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Pending Order
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
