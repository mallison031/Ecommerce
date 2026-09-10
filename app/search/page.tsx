"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Check,
  ChevronDown,
  Package,
  RotateCcw,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ProductCard, ProductData } from "@/components/product-card";
import { formatKoboToNaira } from "@/lib/utils";

interface SectorFacet {
  id: string;
  name: string;
  slug: string;
  totalCatalogProducts: number;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams.get("q") || "";
  const initialSector = searchParams.get("sector") || "all";
  const initialMinPrice = searchParams.get("min_price") || "";
  const initialMaxPrice = searchParams.get("max_price") || "";
  const initialInStock = searchParams.get("in_stock") === "true";
  const initialSort = searchParams.get("sort") || "relevance";

  const [query, setQuery] = useState(initialQ);
  const [selectedSector, setSelectedSector] = useState(initialSector);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [inStockOnly, setInStockOnly] = useState(initialInStock);
  const [sort, setSort] = useState(initialSort);

  const [products, setProducts] = useState<ProductData[]>([]);
  const [sectorFacets, setSectorFacets] = useState<SectorFacet[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync state with URL params when they change
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setSelectedSector(searchParams.get("sector") || "all");
    setMinPrice(searchParams.get("min_price") || "");
    setMaxPrice(searchParams.get("max_price") || "");
    setInStockOnly(searchParams.get("in_stock") === "true");
    setSort(searchParams.get("sort") || "relevance");
  }, [searchParams]);

  // Execute search query
  const fetchSearchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (selectedSector && selectedSector !== "all") params.set("sector", selectedSector);
      if (minPrice.trim()) params.set("min_price", minPrice.trim());
      if (maxPrice.trim()) params.set("max_price", maxPrice.trim());
      if (inStockOnly) params.set("in_stock", "true");
      if (sort && sort !== "relevance") params.set("sort", sort);

      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(
          (data.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            price_kobo: p.price_kobo,
            stock_qty: p.stock_qty,
            image_urls: p.image_urls,
            sector_slug: p.sector_slug,
          }))
        );
        setSectorFacets(data.sectorFacets || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error("Failed fetching search results:", err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedSector, minPrice, maxPrice, inStockOnly, sort]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  // Update URL search params
  const updateUrl = (newParams: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === "" || (k === "sector" && v === "all") || (k === "sort" && v === "relevance")) {
        nextParams.delete(k);
      } else {
        nextParams.set(k, v);
      }
    });
    router.push(`/search?${nextParams.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: query.trim() || null });
  };

  const handleSectorChange = (slug: string) => {
    setSelectedSector(slug);
    updateUrl({ sector: slug === "all" ? null : slug });
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({
      min_price: minPrice.trim() || null,
      max_price: maxPrice.trim() || null,
    });
  };

  const handleInStockToggle = (checked: boolean) => {
    setInStockOnly(checked);
    updateUrl({ in_stock: checked ? "true" : null });
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    updateUrl({ sort: newSort === "relevance" ? null : newSort });
  };

  const handleClearAll = () => {
    setQuery("");
    setSelectedSector("all");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setSort("relevance");
    router.push("/search");
  };

  const activeFilterCount =
    (selectedSector !== "all" ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (query ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Search Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Search className="w-6 h-6 text-pink-600" />
              {query.trim() ? (
                <>
                  Results for &ldquo;<span className="text-pink-600">{query.trim()}</span>&rdquo;
                </>
              ) : (
                "Explore All Products"
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {loading ? (
                "Searching inventory..."
              ) : (
                <>
                  Showing <strong>{totalCount}</strong> product{totalCount === 1 ? "" : "s"} across all 4 store sectors
                </>
              )}
            </p>
          </div>

          {/* Quick Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Keywords, brand, SKU..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-pink-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    updateUrl({ q: null });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        {/* Active Filter Chips & Sort Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
          {/* Active Chips */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-slate-400">Filters:</span>
            {selectedSector !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-pink-50 text-pink-700 border border-pink-200">
                Sector: {selectedSector}
                <button type="button" onClick={() => handleSectorChange("all")}>
                  <X className="w-3 h-3 hover:text-pink-900" />
                </button>
              </span>
            )}

            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Price: ₦{minPrice || "0"} - {maxPrice ? `₦${maxPrice}` : "Any"}
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                    updateUrl({ min_price: null, max_price: null });
                  }}
                >
                  <X className="w-3 h-3 hover:text-slate-900" />
                </button>
              </span>
            )}

            {inStockOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                In-Stock Only
                <button type="button" onClick={() => handleInStockToggle(false)}>
                  <X className="w-3 h-3 hover:text-emerald-900" />
                </button>
              </span>
            )}

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-semibold text-pink-600 hover:text-pink-700 underline"
              >
                Clear all
              </button>
            )}

            {activeFilterCount === 0 && (
              <span className="text-[11px] text-slate-400 italic">No filters applied</span>
            )}
          </div>

          {/* Sort & Mobile Filter Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
            >
              <Filter className="w-3.5 h-3.5 text-pink-600" /> Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-pink-600 text-white text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-pink-500"
              >
                <option value="relevance">Sort: Most Relevant</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar Filters + Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <div className="hidden md:block space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-pink-600" /> Filters
              </h3>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-slate-400 hover:text-pink-600 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Sector Filter */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Sector
              </h4>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSectorChange("all")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    selectedSector === "all"
                      ? "bg-pink-50 text-pink-700 font-bold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>All Sectors</span>
                  {selectedSector === "all" && <Check className="w-3.5 h-3.5 text-pink-600" />}
                </button>
                {sectorFacets.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSectorChange(s.slug)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      selectedSector === s.slug
                        ? "bg-pink-50 text-pink-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] text-slate-400">({s.totalCatalogProducts})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Price Range (₦)
              </h4>
              <form onSubmit={handlePriceApply} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Min (₦)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Max (₦)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="100000"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-pink-500"
                    />
                  </div>
                </div>

                {/* Quick Price Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice("0");
                      setMaxPrice("10000");
                      updateUrl({ min_price: "0", max_price: "10000" });
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded-md transition-colors"
                  >
                    Under ₦10k
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice("10000");
                      setMaxPrice("25000");
                      updateUrl({ min_price: "10000", max_price: "25000" });
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded-md transition-colors"
                  >
                    ₦10k - ₦25k
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice("25000");
                      setMaxPrice("50000");
                      updateUrl({ min_price: "25000", max_price: "50000" });
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded-md transition-colors"
                  >
                    ₦25k - ₦50k
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice("50000");
                      setMaxPrice("");
                      updateUrl({ min_price: "50000", max_price: null });
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded-md transition-colors"
                  >
                    Above ₦50k
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors mt-2"
                >
                  Apply Price
                </button>
              </form>
            </div>

            {/* In-Stock Toggle */}
            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900">In-Stock Only</div>
                  <div className="text-[10px] text-slate-400">Hide sold out items</div>
                </div>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => handleInStockToggle(e.target.checked)}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Mobile Filter Modal */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Filter className="w-4 h-4 text-pink-600" /> Filter Catalog
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sectors */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Sector
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSectorChange("all")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border ${
                      selectedSector === "all"
                        ? "bg-pink-600 text-white border-pink-600"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    All Sectors
                  </button>
                  {sectorFacets.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSectorChange(s.slug)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border truncate ${
                        selectedSector === s.slug
                          ? "bg-pink-600 text-white border-pink-600"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Price (₦)
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min ₦"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Max ₦"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* In-Stock */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">In-Stock Only</span>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => handleInStockToggle(e.target.checked)}
                  className="w-4 h-4 rounded text-pink-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePriceApply({ preventDefault: () => {} } as any);
                    setMobileFilterOpen(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-pink-600 text-xs font-bold text-white shadow-xs"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Grid Area (3 Columns on Desktop) */}
        <div className="md:col-span-3">
          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-pink-600 mb-3" />
              <p className="text-xs font-semibold text-slate-500">Searching products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No matching products found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                We couldn&apos;t find anything matching your exact filter combination. Try clearing your filters or searching for alternative keywords.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                </button>
              </div>

              {/* Browse popular sectors */}
              <div className="pt-6 border-t border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Or explore our popular sectors:
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Link
                    href="/search?sector=jewelry"
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                  >
                    Jewelry & Accessories
                  </Link>
                  <Link
                    href="/search?sector=girly-essentials"
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                  >
                    Girly Essentials
                  </Link>
                  <Link
                    href="/search?sector=content-accessories"
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                  >
                    Content Accessories
                  </Link>
                  <Link
                    href="/search?sector=kitchen-souvenirs"
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                  >
                    Kitchen/Souvenirs
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-pink-600 mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading catalog...</p>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
