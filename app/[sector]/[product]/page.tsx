import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductDetailView } from "@/components/product-detail-view";
import { ProductCard, ProductData } from "@/components/product-card";
import { ProductReviewsSection } from "@/components/product-reviews-section";
import { getProductReviewsAndSummary } from "@/lib/reviews";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { sector: string; product: string };
}): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.product },
    include: { sector: true },
  });

  if (!product || product.sector.slug !== params.sector) {
    return { title: "Product Not Found | Aura Store" };
  }

  return {
    title: `${product.name} | ${product.sector.name} | Aura Store`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.image_urls.length > 0 ? [{ url: product.image_urls[0] }] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { sector: string; product: string };
}) {
  const product = await prisma.product.findUnique({
    where: { slug: params.product },
    include: { sector: true },
  });

  if (!product || product.sector.slug !== params.sector) {
    notFound();
  }

  // Fetch up to 4 other related products from the same sector
  const relatedProducts = await prisma.product.findMany({
    where: {
      sector_id: product.sector_id,
      id: { not: product.id },
      is_active: true,
    },
    take: 4,
  });

  // Fetch reviews and social proof summary
  const { reviews, summary } = await getProductReviewsAndSummary(product.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href={`/${product.sector.slug}`} className="hover:text-slate-900 transition-colors">
          {product.sector.name}
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-none">
          {product.name}
        </span>
      </nav>

      {/* Main Product Detail Section */}
      <ProductDetailView product={product} sector={product.sector} ratingSummary={summary} />

      {/* Customer Reviews & UGC Section */}
      <div id="reviews-section">
        <ProductReviewsSection
          productId={product.id}
          productName={product.name}
          initialReviews={reviews}
          initialSummary={summary}
        />
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="pt-10 border-t border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">More in {product.sector.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Explore similar curated items from this sector</p>
            </div>
            <Link
              href={`/${product.sector.slug}`}
              className="text-xs font-bold text-pink-600 hover:text-pink-700"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel as ProductData}
                sectorSlug={product.sector.slug}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
