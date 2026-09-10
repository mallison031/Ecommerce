"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Loader2, ArrowRight, Package, Sparkles } from "lucide-react";
import { formatKoboToNaira } from "@/lib/utils";

interface AutocompleteProduct {
  id: string;
  name: string;
  slug: string;
  price_kobo: number;
  stock_qty: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  image_urls: string[];
  sector_name: string;
  sector_slug: string;
}

interface SectorSuggestion {
  name: string;
  slug: string;
}

export function HeaderSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AutocompleteProduct[]>([]);
  const [sectorSuggestions, setSectorSuggestions] = useState<SectorSuggestion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced autocomplete query
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSectorSuggestions([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&type=autocomplete&limit=6`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
          setSectorSuggestions(data.sectorSuggestions || []);
          setTotalCount(data.totalCount || 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error("Search autocomplete error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsOpen(false);
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || results.length === 0) {
      if (e.key === "Enter") handleSubmit();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const selected = results[selectedIndex];
        setIsOpen(false);
        router.push(`/${selected.sector_slug}/${selected.slug}`);
      } else {
        handleSubmit();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs sm:max-w-sm lg:max-w-md mx-2 sm:mx-4">
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search jewelry, perfumes, gadgets..."
          className="w-full pl-9 pr-8 py-1.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-full border border-slate-200/80 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all outline-hidden"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </form>

      {/* Predictive Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Matching Sector Tags */}
          {sectorSuggestions.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Sectors:
              </span>
              {sectorSuggestions.map((s) => (
                <Link
                  key={s.slug}
                  href={`/search?sector=${s.slug}&q=${encodeURIComponent(query)}`}
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:border-pink-500 hover:text-pink-600 transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3 h-3 text-pink-500" />
                  {s.name}
                </Link>
              ))}
            </div>
          )}

          {/* Autocomplete Products List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && results.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-pink-600 mb-2" />
                Searching catalog...
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-slate-500">
                  No direct product matches for &ldquo;<span className="font-semibold text-slate-800">{query}</span>&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="mt-2 text-xs font-semibold text-pink-600 hover:text-pink-700 inline-flex items-center gap-1"
                >
                  Search all products <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              results.map((prod, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <Link
                    key={prod.id}
                    href={`/${prod.sector_slug}/${prod.slug}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 p-3 transition-colors ${
                      isSelected ? "bg-pink-50/70" : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Thumbnail */}
                    {prod.image_urls && prod.image_urls[0] ? (
                      <img
                        src={prod.image_urls[0]}
                        alt={prod.name}
                        className="w-11 h-11 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {prod.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-slate-500 capitalize">
                          {prod.sector_name}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-xs font-bold text-slate-900">
                          {formatKoboToNaira(prod.price_kobo)}
                        </span>
                      </div>
                    </div>

                    {/* Stock status indicator */}
                    <div className="shrink-0 text-right">
                      {prod.stockStatus === "out_of_stock" ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                          Sold Out
                        </span>
                      ) : prod.stockStatus === "low_stock" ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {prod.stock_qty} left
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          In Stock
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Bottom Footer: View all results */}
          {results.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Found {totalCount} matching product{totalCount === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors"
              >
                View all results <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
