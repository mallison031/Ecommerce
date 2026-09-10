import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create Sectors
  const sectorsData = [
    {
      name: "Jewelry & Accessories",
      slug: "jewelry-accessories",
      display_order: 1,
    },
    {
      name: "Girly Essentials",
      slug: "girly-essentials",
      display_order: 2,
    },
    {
      name: "Content Accessories",
      slug: "content-accessories",
      display_order: 3,
    },
    {
      name: "Kitchen/Souvenirs",
      slug: "kitchen-souvenirs",
      display_order: 4,
    },
  ];

  for (const s of sectorsData) {
    await prisma.sector.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }

  const sectors = await prisma.sector.findMany();
  const sectorMap = new Map(sectors.map((s) => [s.slug, s.id]));

  // 2. Create Sample Products
  const productsData = [
    {
      sector_id: sectorMap.get("jewelry-accessories")!,
      name: "18K Gold Plated Minimalist Chain",
      slug: "18k-gold-plated-minimalist-chain",
      description: "Dainty, tarnish-resistant gold-plated chain necklace suitable for everyday wear.",
      price_kobo: 1250000, // ₦12,500.00
      stock_qty: 25,
      image_urls: ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("jewelry-accessories")!,
      name: "Chunky Pearl Drop Earrings",
      slug: "chunky-pearl-drop-earrings",
      description: "Elegant freshwater baroque pearl drops with hypoallergenic gold posts.",
      price_kobo: 850000, // ₦8,500.00
      stock_qty: 15,
      image_urls: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("girly-essentials")!,
      name: "Velvet Quilted Cosmetic Bag",
      slug: "velvet-quilted-cosmetic-bag",
      description: "Spacious luxury cosmetic pouch with gold zipper and water-resistant interior lining.",
      price_kobo: 950000, // ₦9,500.00
      stock_qty: 30,
      image_urls: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("girly-essentials")!,
      name: "Hydrating Lip Oil Gift Trio",
      slug: "hydrating-lip-oil-gift-trio",
      description: "Non-sticky, nourishing lip gloss set infused with vitamin E and jojoba oil.",
      price_kobo: 700000, // ₦7,000.00
      stock_qty: 40,
      image_urls: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("content-accessories")!,
      name: "10-inch Desktop LED Ring Light with Tripod",
      slug: "10-inch-desktop-led-ring-light",
      description: "Dimmable 3-color mode ring light with phone holder for TikTok and Instagram creators.",
      price_kobo: 1800000, // ₦18,000.00
      stock_qty: 20,
      image_urls: ["https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("content-accessories")!,
      name: "Wireless Lavalier Microphone for Smartphone",
      slug: "wireless-lavalier-microphone",
      description: "Plug-and-play wireless lapel mic for crisp audio recording with noise cancellation.",
      price_kobo: 2200000, // ₦22,000.00
      stock_qty: 18,
      image_urls: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("kitchen-souvenirs")!,
      name: "Aesthetic Glass Tumbler with Bamboo Lid & Straw",
      slug: "aesthetic-glass-tumbler-bamboo-lid",
      description: "Eco-friendly iced coffee and boba tumbler with silicone protective sleeve.",
      price_kobo: 650000, // ₦6,500.00
      stock_qty: 50,
      image_urls: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("kitchen-souvenirs")!,
      name: "Custom Gift Set Stainless Cutlery Souvenir",
      slug: "custom-stainless-cutlery-souvenir",
      description: "Premium gold-toned 4-piece cutlery set in a presentation gift box, ideal for wedding souvenirs.",
      price_kobo: 1100000, // ₦11,000.00
      stock_qty: 35,
      image_urls: ["https://images.unsplash.com/photo-1615865417491-9941019fbc00?w=600&q=80"],
      is_active: true,
    },
  ];

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  // 3. Create Default Admin User
  await prisma.adminUser.upsert({
    where: { email: "admin@store.com" },
    update: {},
    create: {
      email: "admin@store.com",
      password_hash: "admin_password_hash_placeholder",
      role: "owner",
      whatsapp_phone_e164: "+2348000000000",
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
