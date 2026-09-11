"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Clock, ChevronRight, X, Copy, Check } from "lucide-react";
import type { FlashSale as LegacySectorSale } from "@/lib/promotions";

interface FlashSaleData {
  id: string;
  title: string;
  discount_percentage: number;
  banner_text: string;
  remaining_seconds: number;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    sector_slug: string;
    price_kobo: number;
    promo_price_kobo: number;
  }>;
}

function SectorFlashSaleBanner({ sale }: { sale: LegacySectorSale | any }) {
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
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${sale.bannerBg || "from-amber-500 to-rose-500"} text-white shadow-lg p-4 sm:p-6 mb-8`}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
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

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 shrink-0">
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

export function FlashSaleBanner({ sale: legacySale }: { sale?: LegacySectorSale } = {}) {
  if (legacySale) {
    return <SectorFlashSaleBanner sale={legacySale} />;
  }
  return <GlobalFlashSaleBanner />;
}

function GlobalFlashSaleBanner() {
  const [sale, setSale] = useState<FlashSaleData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function loadSale() {
      try {
        const res = await fetch("/api/flash-sales");
        const data = await res.json();
        if (data.success && data.active_sale) {
          setSale(data.active_sale);
          setTimeLeft(data.active_sale.remaining_seconds);
        }
      } catch (err) {
        console.error("Failed to fetch flash sale banner:", err);
      }
    }

    loadSale();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  if (!sale || timeLeft <= 0 || dismissed) return null;

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const firstProduct = sale.products[0];
  const targetUrl = firstProduct
    ? `/${firstProduct.sector_slug}/${firstProduct.slug}`
    : "/search";

  return (
    <aside
      aria-label="Limited-time flash sale announcement"
      className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 shadow-md transition-all relative z-40"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="inline-flex items-center justify-center p-1 bg-white/20 rounded-full animate-pulse">
            <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
          </span>
          <span className="font-bold tracking-wide uppercase text-[11px] sm:text-xs bg-black/20 px-2 py-0.5 rounded text-amber-200 shrink-0">
            {sale.discount_percentage}% OFF Flash Sale
          </span>
          <p className="truncate text-white/95 text-xs sm:text-sm font-medium">
            {sale.banner_text}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Live countdown badge */}
          <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-md text-amber-100 font-mono text-xs shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="tracking-wider">
              {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>

          <Link
            href={targetUrl}
            className="hidden sm:inline-flex items-center gap-1 bg-white text-rose-700 hover:bg-rose-50 px-3 py-1 rounded text-xs font-bold transition shadow-sm"
          >
            Claim Deal
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="text-white/80 hover:text-white p-1 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
