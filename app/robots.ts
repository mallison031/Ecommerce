import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aurastore.ng";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/*", "/api/*", "/checkout/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
