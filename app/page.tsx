import { prisma } from "@/lib/db/prisma";
import { ProductCard, ProductData } from "@/components/product-card";
import { Sparkles, MessageCircle, Truck, ShieldCheck, HeartHandshake } from "lucide-react";
import Link from "next/link";

// A build-time snapshot would freeze prices and stock, and would also make the
// build itself depend on Neon being reachable. Render on every request instead.
export const dynamic = "force-dynamic";

async function getSectorsWithProducts() {
  return prisma.sector.findMany({
    orderBy: { display_order: "asc" },
    include: {
      products: {
        where: { is_active: true },
        orderBy: { created_at: "desc" },
      },
    },
  });
}

export default async function HomePage() {
  const sectors = await getSectorsWithProducts();

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pink-50/60 via-slate-50 to-white py-16 md:py-24 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-100/80 text-pink-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Curated Essentials for Work & Lifestyle
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto">
            Elevate Your Everyday Vibe with Aura.
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
            Discover curated jewelry, girly lifestyle picks, content creation tools, and luxury souvenirs. Guest checkout in seconds with Paystack.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#jewelry-accessories"
              className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all shadow-sm"
            >
              Shop All Sectors
            </a>
            <a
              href="https://wa.me/2348000000000?text=Hello%2C%20I%20have%20an%20inquiry%20about%20a%20product"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm"
            >
              <MessageCircle className="w-4 h-4" /> Ask via WhatsApp
            </a>
          </div>

          {/* Value Props */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Fast Delivery</h4>
                <p className="text-[11px] text-slate-500">Lagos next-day, nationwide 2-5 days</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Secure Payments</h4>
                <p className="text-[11px] text-slate-500">Encrypted Paystack checkout</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Direct WhatsApp Help</h4>
                <p className="text-[11px] text-slate-500">Human support ready to assist</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sector Navigation Chips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-2">
            Categories:
          </span>
          {sectors.map((s) => (
            <a
              key={s.id}
              href={`#${s.slug}`}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-slate-900 hover:text-slate-900 transition-all whitespace-nowrap"
            >
              {s.name}
            </a>
          ))}
        </div>
      </div>

      {/* Sectors & Product Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {sectors.map((sector) => (
          <section key={sector.id} id={sector.slug} className="scroll-mt-24">
            <div className="flex items-end justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <Link href={`/${sector.slug}`} className="group">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-pink-600 transition-colors">
                    {sector.name}
                  </h2>
                </Link>
                <p className="text-xs text-slate-500 mt-1">Hand-picked collection with guaranteed quality</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400">
                  {sector.products.length} {sector.products.length === 1 ? "item" : "items"}
                </span>
                <Link
                  href={`/${sector.slug}`}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 hidden sm:inline"
                >
                  View Sector →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {sector.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product as ProductData}
                  sectorSlug={sector.slug}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* WhatsApp Help Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-900 text-white rounded-2xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="relative z-10 max-w-xl text-center md:text-left">
            <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Fast & Friendly Support</span>
            <h3 className="text-2xl md:text-3xl font-extrabold mt-2">Have questions before placing an order?</h3>
            <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
              Message us on WhatsApp to verify item availability, custom souvenir requests, or Lagos express same-day courier dispatch.
            </p>
          </div>
          <div className="relative z-10">
            <a
              href="https://wa.me/2348000000000?text=Hello%2C%20I%20have%20an%20inquiry%20about%20your%20store"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-emerald-900 font-bold text-sm hover:bg-emerald-50 transition-all shadow-md"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
