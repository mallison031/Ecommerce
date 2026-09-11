import { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aurastore.ng";

  // Static high-value routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/track-order`,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/returns`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    // Dynamic Sector pages
    const sectors = await prisma.sector.findMany({
      select: {
        slug: true,
        updated_at: true,
      },
    });

    const sectorRoutes: MetadataRoute.Sitemap = sectors.map((sector) => ({
      url: `${baseUrl}/${sector.slug}`,
      lastModified: sector.updated_at || new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    }));

    // Dynamic Product Detail pages
    const products = await prisma.product.findMany({
      where: { is_active: true },
      select: {
        slug: true,
        updated_at: true,
        sector: {
          select: { slug: true },
        },
      },
    });

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/${product.sector.slug}/${product.slug}`,
      lastModified: product.updated_at || new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    }));

    return [...staticRoutes, ...sectorRoutes, ...productRoutes];
  } catch (err) {
    console.error("Error generating dynamic sitemap:", err);
    return staticRoutes;
  }
}
