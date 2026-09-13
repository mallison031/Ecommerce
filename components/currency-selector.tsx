"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useCurrency } from "@/context/currency-context";

export function CurrencySelector() {
  const { currency, setCurrency, availableCurrencies } = useCurrency();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currencies =
    availableCurrencies.length > 0
      ? availableCurrencies
      : [
          { code: "NGN", symbol: "₦", name: "Naira" },
          { code: "USD", symbol: "$", name: "US Dollar" },
          { code: "GBP", symbol: "£", name: "British Pound" },
          { code: "EUR", symbol: "€", name: "Euro" },
        ];

  const active = currencies.find((c) => c.code === currency) || currencies[0];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white/90 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all shadow-2xs"
        aria-label="Select Currency"
      >
        <Globe className="w-3.5 h-3.5 text-slate-500" />
        <span>
          {active.code} ({active.symbol})
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Display Currency
          </div>
          {currencies.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setCurrency(c.code);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors text-slate-700"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold w-4 text-center">{c.symbol}</span>
                <span>{c.code}</span>
              </div>
              {c.code === currency && <Check className="w-3.5 h-3.5 text-pink-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
