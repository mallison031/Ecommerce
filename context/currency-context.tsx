"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { convertFromKobo } from "@/lib/currency/currency-service";

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => void;
  availableCurrencies: { code: string; name: string; symbol: string; exchange_rate_to_ngn: number }[];
  formatPrice: (kobo: number) => string;
  convertPrice: (kobo: number) => { amount: number; formatted: string };
  rates: Record<string, number>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>("NGN");
  const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ NGN: 1.0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved currency preference from localStorage
    try {
      const saved = localStorage.getItem("aura_preferred_currency");
      if (saved) setCurrencyState(saved);
    } catch {}

    async function fetchRates() {
      try {
        const res = await fetch("/api/currency/rates");
        const data = await res.json();
        if (res.ok && data.success) {
          setAvailableCurrencies(data.currencies || []);
          setRates(data.rates || { NGN: 1.0 });
        }
      } catch (err) {
        console.error("Error fetching currency rates:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
  }, []);

  const setCurrency = (code: string) => {
    setCurrencyState(code);
    try {
      localStorage.setItem("aura_preferred_currency", code);
    } catch {}
  };

  const convertPrice = (kobo: number) => {
    const rate = rates[currency] || 1.0;
    return convertFromKobo(kobo, currency, rate);
  };

  const formatPrice = (kobo: number) => {
    return convertPrice(kobo).formatted;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        availableCurrencies,
        formatPrice,
        convertPrice,
        rates,
        loading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    return {
      currency: "NGN",
      setCurrency: () => {},
      availableCurrencies: [],
      formatPrice: (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`,
      convertPrice: (kobo: number) => ({
        amount: kobo / 100,
        formatted: `₦${(kobo / 100).toLocaleString("en-NG")}`,
      }),
      rates: { NGN: 1.0 },
      loading: false,
    };
  }
  return context;
}
