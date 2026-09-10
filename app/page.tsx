import { prisma } from "@/lib/db/prisma";
import { ProductCard, ProductData } from "@/components/product-card";
import { Sparkles, MessageCircle, Truck, ShieldCheck, HeartHandshake } from "lucide-react";
import Link from "next/link";

// Fallback products in case database is not yet migrated
const FALLBACK_SECTORS = [
  {
    id: "s1",
    name: "Jewelry & Accessories",
    slug: "jewelry-accessories",
    products: [
      {
        id: "p1",
        name: "18K Gold Plated Minimalist Chain",
        slug: "18k-gold-plated-minimalist-chain",
        description: "Dainty, tarnish-resistant gold-plated chain necklace suitable for everyday wear.",
        price_kobo: 1250000,
        stock_qty: 25,
        image_urls: ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80"],
      },
      {
        id: "p2",
        name: "Chunky Pearl Drop Earrings",
        slug: "chunky-pearl-drop-earrings",
        description: "Elegant freshwater baroque pearl drops with hypoallergenic gold posts.",
        price_kobo: 850000,
        stock_qty: 15,
        image_urls: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80"],
      },
    ],
  },
  {
    id: "s2",
    name: "Girly Essentials",
    slug: "girly-essentials",
    products: [
      {
        id: "p3",
        name: "Velvet Quilted Cosmetic Bag",
        slug: "velvet-quilted-cosmetic-bag",
        description: "Spacious luxury cosmetic pouch with gold zipper and water-resistant interior lining.",
        price_kobo: 950000,
        stock_qty: 30,
        image_urls: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80"],
      },
      {
        id: "p4",
        name: "Hydrating Lip Oil Gift Trio",
        slug: "hydrating-lip-oil-gift-trio",
        description: "Non-sticky, nourishing lip gloss set infused with vitamin E and jojoba oil.",
        price_kobo: 700000,
        stock_qty: 40,
        image_urls: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80"],
      },
    ],
  },
  {
    id: "s3",
    name: "Content Accessories",
    slug: "content-accessories",
    products: [
      {
        id: "p5",
        name: "10-inch Desktop LED Ring Light with Tripod",
        slug: "10-inch-desktop-led-ring-light",
        description: "Dimmable 3-color mode ring light with phone holder for TikTok and Instagram creators.",
        price_kobo: 1800000,
        stock_qty: 20,
        image_urls: ["https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=600&q=80"],
      },
      {
        id: "p6",
        name: "Wireless Lavalier Microphone for Smartphone",
        slug: "wireless-lavalier-microphone",
        description: "Plug-and-play wireless lapel mic for crisp audio recording with noise cancellation.",
        price_kobo: 2200000,
        stock_qty: 18,
        image_urls: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80"],
      },
    ],
  },
  {
    id: "s4",
    name: "Kitchen/Souvenirs",
    slug: "kitchen-souvenirs",
    products: [
      {
        id: "p7",
        name: "Aesthetic Glass Tumbler with Bamboo Lid & Straw",
        slug: "aesthetic-glass-tumbler-bamboo-lid",
        description: "Eco-friendly iced coffee and boba tumbler with silicone protective sleeve.",
        price_kobo: 650000,
        stock_qty: 50,
        image_urls: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80"],
      },
      {
        id: "p8",
        name: "Custom Gift Set Stainless Cutlery Souvenir",
        slug: "custom-stainless-cutlery-souvenir",
        description: "Premium gold-toned 4-piece cutlery set in a presentation gift box, ideal for wedding souvenirs.",
        price_kobo: 1100000,
        stock_qty: 35,
        image_urls: ["https://images.unsplash.com/photo-1615865417491-9941019fbc00?w=600&q=80"],
      },
    ],
  },
];

async function getSectorsWithProducts() {
  try {
    const sectors = await prisma.sector.findMany({
      orderBy: { display_order: "asc" },
      include: {
        products: {
          where: { is_active: true },
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (sectors.length > 0) {
      return sectors;
    }
  } catch (err) {
    console.warn("Database not ready, using fallback catalog data for storefront preview.");
  }
  return FALLBACK_SECTORS;
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
