import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard, ProductData } from "@/components/product-card";
import { ArrowLeft, MessageCircle, SlidersHorizontal } from "lucide-react";
import { FlashSaleBanner } from "@/components/flash-sale-banner";
import { getActiveFlashSales } from "@/lib/promotions";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { sector: string };
}): Promise<Metadata> {
  const sector = await prisma.sector.findUnique({
    where: { slug: params.sector },
  });

  if (!sector) {
    return { title: "Sector Not Found | Aura Store" };
  }

  return {
    title: `${sector.name} | Aura Store`,
    description: `Shop our curated collection of ${sector.name}. Fast delivery across Nigeria.`,
  };
}

export default async function SectorPage({
  params,
  searchParams,
}: {
  params: { sector: string };
  searchParams: { sort?: string };
}) {
  const sector = await prisma.sector.findUnique({
    where: { slug: params.sector },
    include: {
      products: {
        where: { is_active: true },
      },
    },
  });

  if (!sector) {
    notFound();
  }

  let products = [...sector.products];

  // Apply sorting
  if (searchParams.sort === "price-low") {
    products.sort((a, b) => a.price_kobo - b.price_kobo);
  } else if (searchParams.sort === "price-high") {
    products.sort((a, b) => b.price_kobo - a.price_kobo);
  } else {
    // default: newest
    products.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  const allSectors = await prisma.sector.findMany({
    orderBy: { display_order: "asc" },
  });

  const flashSales = getActiveFlashSales(sector.slug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">{sector.name}</span>
      </nav>

      {/* Flash Sale Banner if active */}
      {flashSales.length > 0 && <FlashSaleBanner sale={flashSales[0]} />}

      {/* Sector Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-pink-600 uppercase tracking-wider">Sector Catalog</span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{sector.name}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse our hand-picked inventory with guaranteed quality and verified availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sorting Dropdown Links */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-1">
            <span className="px-2 text-slate-400 font-medium">Sort:</span>
            <Link
              href={`/${sector.slug}`}
              className={`px-2.5 py-1 rounded-md transition-all ${
                !searchParams.sort ? "bg-slate-900 text-white font-semibold" : "hover:bg-slate-100"
              }`}
            >
              Newest
            </Link>
            <Link
              href={`/${sector.slug}?sort=price-low`}
              className={`px-2.5 py-1 rounded-md transition-all ${
                searchParams.sort === "price-low" ? "bg-slate-900 text-white font-semibold" : "hover:bg-slate-100"
              }`}
            >
              Price: Low
            </Link>
            <Link
              href={`/${sector.slug}?sort=price-high`}
              className={`px-2.5 py-1 rounded-md transition-all ${
                searchParams.sort === "price-high" ? "bg-slate-900 text-white font-semibold" : "hover:bg-slate-100"
              }`}
            >
              Price: High
            </Link>
          </div>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-2">
          Other Sectors:
        </span>
        {allSectors.map((s) => (
          <Link
            key={s.id}
            href={`/${s.slug}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              s.slug === sector.slug
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:border-slate-900"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <p className="text-sm text-slate-500">No active products found in this sector right now.</p>
          <Link href="/" className="mt-4 inline-block text-xs font-semibold text-pink-600 hover:underline">
            ← Return to Homepage
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product as ProductData}
              sectorSlug={sector.slug}
            />
          ))}
        </div>
      )}

      {/* Sector WhatsApp Assistance Callout */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Looking for a specific item in {sector.name}?</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Our team can check unlisted stock or arrange custom souvenir orders directly on WhatsApp.
          </p>
        </div>
        <a
          href={`https://wa.me/2348000000000?text=Hello%2C%20I%20have%20an%20inquiry%20regarding%20products%20in%20${encodeURIComponent(
            sector.name
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs shrink-0"
        >
          <MessageCircle className="w-4 h-4" /> Ask via WhatsApp
        </a>
      </div>
    </div>
  );
}
