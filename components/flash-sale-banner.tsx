"use client";

import React, { useState, useEffect } from "react";
import { Zap, Clock, Copy, Check } from "lucide-react";
import { FlashSale } from "@/lib/promotions";

interface FlashSaleBannerProps {
  sale: FlashSale;
}

export function FlashSaleBanner({ sale }: FlashSaleBannerProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calculateTime() {
      const difference = +new Date(sale.endsAt) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor(difference / (1000 * 60 * 60)),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    }

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [sale.endsAt]);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(sale.promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${sale.bannerBg} text-white shadow-lg p-4 sm:p-6 mb-8`}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Badge & Title */}
        <div className="flex items-center gap-3.5 text-center md:text-left">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
            <Zap className="w-6 h-6 text-yellow-300 fill-yellow-300 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider text-yellow-200">
              ⚡ Flash Sale — Limited Time
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">{sale.title}</h2>
            <p className="text-xs text-white/90">
              Get an instant <span className="font-bold underline decoration-yellow-300">{sale.discountPercent}% OFF</span> at checkout with code:
            </p>
          </div>
        </div>

        {/* Right: Countdown & Promo Code Button */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 shrink-0">
          {/* Countdown timer */}
          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <Clock className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-[11px] font-medium text-white/80 mr-1">Ends in:</span>
            <div className="font-mono font-bold tracking-wider text-sm flex items-center gap-1 text-yellow-300">
              <span>{String(timeLeft.hours).padStart(2, "0")}h</span>
              <span>:</span>
              <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>
              <span>:</span>
              <span>{String(timeLeft.seconds).padStart(2, "0")}s</span>
            </div>
          </div>

          {/* Promo code badge with 1-click copy */}
          <button
            type="button"
            onClick={handleCopy}
            className="group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white text-slate-900 font-mono text-xs font-black shadow-md hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all"
            title="Click to copy coupon code"
          >
            <span className="tracking-wider">{sale.promoCode}</span>
            {copied ? (
              <span className="flex items-center text-[10px] text-emerald-600 font-sans font-bold">
                <Check className="w-3.5 h-3.5 mr-0.5" /> Copied!
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
