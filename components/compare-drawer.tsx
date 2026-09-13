"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCompareStore } from "@/lib/stores/compare-store";
import { Scale, X, ArrowRight, Trash2 } from "lucide-react";
import { formatNaira } from "@/lib/utils";

export function CompareDrawer() {
  const { items, removeItem, clear } = useCompareStore();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || items.length === 0 || pathname === "/compare") {
    return null;
  }

  return (
    <aside
      aria-label="Product comparison tray"
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border-t border-slate-700/60 p-3 sm:p-4 transition-all animate-in slide-in-from-bottom-6"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Summary & Header */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide uppercase text-pink-400">
                Compare Tray
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
                {items.length}/4 items
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Side-by-side specs, pricing & features
            </p>
          </div>
        </div>

        {/* Center: Thumbnails */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl p-1.5 pr-2.5 shrink-0"
            >
              <div className="w-9 h-9 relative rounded-lg overflow-hidden bg-slate-700 shrink-0">
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              </div>
              <div className="min-w-0 max-w-[120px]">
                <p className="text-[11px] font-bold text-white truncate">{item.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {formatNaira(item.price_kobo)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition shrink-0"
                aria-label={`Remove ${item.name} from compare`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={clear}
            className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
            title="Clear comparison list"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <Link
            href="/compare"
            className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
          >
            <span>Compare Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
