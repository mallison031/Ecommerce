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
    // --- Sector 1: Jewelry & Accessories (Additional items) ---
    {
      sector_id: sectorMap.get("jewelry-accessories")!,
      name: "Sparkling Crystal Tennis Bracelet",
      slug: "sparkling-crystal-tennis-bracelet",
      description: "Water-resistant sparkling cubic zirconia tennis bracelet with double safety clasp in 18K white gold finish.",
      price_kobo: 1400000, // ₦14,000.00
      stock_qty: 22,
      image_urls: ["https://images.unsplash.com/photo-1611591475879-199616d2ca88?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("jewelry-accessories")!,
      name: "Stainless Steel Herringbone Chain",
      slug: "stainless-steel-herringbone-chain",
      description: "Flat snake bone herringbone chain necklace, waterproof and anti-fade stainless steel.",
      price_kobo: 1050000, // ₦10,500.00
      stock_qty: 30,
      image_urls: ["https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("jewelry-accessories")!,
      name: "Stacked Minimalist Gold Rings Set",
      slug: "stacked-minimalist-gold-rings-set",
      description: "Set of 5 minimalist stackable knuckle and midi rings in lustrous gold finish.",
      price_kobo: 650000, // ₦6,500.00
      stock_qty: 45,
      image_urls: ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("jewelry-accessories")!,
      name: "Geometric Tortoiseshell Statement Earrings",
      slug: "geometric-tortoiseshell-statement-earrings",
      description: "Ultra-lightweight tortoiseshell and resin geometric drop earrings for stylish daily wear.",
      price_kobo: 500000, // ₦5,000.00
      stock_qty: 35,
      image_urls: ["https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&q=80"],
      is_active: true,
    },
    // --- Sector 2: Girly Essentials (Additional items) ---
    {
      sector_id: sectorMap.get("girly-essentials")!,
      name: "Satin Silk Sleep Bonnet & Scrunchie Set",
      slug: "satin-silk-sleep-bonnet-scrunchie-set",
      description: "Double-layered reversible pure satin hair bonnet with matching jumbo scrunchie to protect curls.",
      price_kobo: 550000, // ₦5,500.00
      stock_qty: 60,
      image_urls: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("girly-essentials")!,
      name: "Rose Quartz Face Roller & Gua Sha Duo",
      slug: "rose-quartz-face-roller-gua-sha-duo",
      description: "100% natural rose quartz facial roller and sculpted gua sha scraping stone for lymphatic drainage.",
      price_kobo: 800000, // ₦8,000.00
      stock_qty: 25,
      image_urls: ["https://images.unsplash.com/photo-1608248597358-1e428cf125c1?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("girly-essentials")!,
      name: "Refillable Travel Perfume Atomizer",
      slug: "refillable-travel-perfume-atomizer",
      description: "Leak-proof 5ml bottom-pump refillable mini pocket perfume spray bottle for on-the-go touchups.",
      price_kobo: 350000, // ₦3,500.00
      stock_qty: 80,
      image_urls: ["https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("girly-essentials")!,
      name: "Coral Fleece Spa Headband & Wristbands",
      slug: "coral-fleece-spa-headband-wristbands",
      description: "Ultra-soft coral fleece bubble headband and wrist wash bands preventing water drips down arms.",
      price_kobo: 420000, // ₦4,200.00
      stock_qty: 50,
      image_urls: ["https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600&q=80"],
      is_active: true,
    },
    // --- Sector 3: Content Accessories (Additional items) ---
    {
      sector_id: sectorMap.get("content-accessories")!,
      name: "Flexible All-Terrain Octopus Tripod with Remote",
      slug: "flexible-octopus-tripod-remote",
      description: "All-terrain bendable legs gorilla-style phone tripod with Bluetooth shutter remote.",
      price_kobo: 1150000, // ₦11,500.00
      stock_qty: 28,
      image_urls: ["https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("content-accessories")!,
      name: "Magnetic Wireless Fast Charging Car Mount",
      slug: "magnetic-wireless-fast-charging-car-mount",
      description: "Strong magnetic MagSafe dashboard & vent phone holder with fast induction charging.",
      price_kobo: 1500000, // ₦15,000.00
      stock_qty: 20,
      image_urls: ["https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("content-accessories")!,
      name: "Portable 360 RGB Pocket Video Light",
      slug: "portable-360-rgb-pocket-video-light",
      description: "Rechargeable 360-degree full-color mini LED video photography fill light with cold shoe mount.",
      price_kobo: 1650000, // ₦16,500.00
      stock_qty: 22,
      image_urls: ["https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("content-accessories")!,
      name: "Dual Type-C and Lightning Audio Splitter",
      slug: "dual-type-c-lightning-audio-splitter",
      description: "High-fidelity braided USB-C and Lightning audio splitter with 3.5mm jack for collaborative listening.",
      price_kobo: 480000, // ₦4,800.00
      stock_qty: 40,
      image_urls: ["https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80"],
      is_active: true,
    },
    // --- Sector 4: Kitchen/Souvenirs (Additional items) ---
    {
      sector_id: sectorMap.get("kitchen-souvenirs")!,
      name: "Matte Black Double-Wall Thermal Flask 750ml",
      slug: "matte-black-double-wall-thermal-flask-750ml",
      description: "Double-wall insulated 750ml vacuum thermos keeping water icy cold for 24h or hot for 12h.",
      price_kobo: 950000, // ₦9,500.00
      stock_qty: 35,
      image_urls: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("kitchen-souvenirs")!,
      name: "Organic Soy Wax Scented Candle Gift Jar",
      slug: "organic-soy-wax-scented-candle-gift-jar",
      description: "Hand-poured organic soy wax candle scented with French vanilla and lavender in amber glass.",
      price_kobo: 750000, // ₦7,500.00
      stock_qty: 40,
      image_urls: ["https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("kitchen-souvenirs")!,
      name: "12-Piece Non-Scratch Silicone Utensil Set",
      slug: "12-piece-non-scratch-silicone-utensil-set",
      description: "12-piece non-scratch wooden handle cooking utensils set with matching countertop crock.",
      price_kobo: 1750000, // ₦17,500.00
      stock_qty: 15,
      image_urls: ["https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600&q=80"],
      is_active: true,
    },
    {
      sector_id: sectorMap.get("kitchen-souvenirs")!,
      name: "Acacia Wood Engraved Coaster Set (6-Pack)",
      slug: "acacia-wood-engraved-coaster-set-6pack",
      description: "Pack of 6 laser-carved natural cork & acacia wood drink coasters with souvenir gift ribbon.",
      price_kobo: 550000, // ₦5,500.00
      stock_qty: 50,
      image_urls: ["https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80"],
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
