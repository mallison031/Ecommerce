import { prisma } from "@/lib/db/prisma";

export async function seedInitialReviews() {
  const existingCount = await prisma.productReview.count();
  if (existingCount > 0) {
    return;
  }

  const products = await prisma.product.findMany({
    take: 6,
    select: { id: true, name: true, sector: { select: { slug: true } } },
  });

  if (products.length === 0) return;

  const sampleReviews = [
    {
      customerName: "Chioma Okonkwo",
      customerEmail: "chioma.o@example.com",
      rating: 5,
      headline: "Exceeded my expectations! Quality is top tier",
      comment:
        "Ordered this to Victoria Island and it arrived in less than 24 hours! Packaging was immaculate and the quality looks even better than the product photos. Will definitely buy again!",
      photoUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80",
      isVerifiedBuyer: true,
      helpfulVotes: 14,
    },
    {
      customerName: "Babatunde Adeleke",
      customerEmail: "babatunde.a@example.com",
      rating: 5,
      headline: "Super fast dispatch & authentic material",
      comment:
        "I was slightly hesitant about ordering online without seeing it in person first, but the WhatsApp team answered all my questions instantly. Item is sturdy and premium.",
      photoUrl: null,
      isVerifiedBuyer: true,
      helpfulVotes: 8,
    },
    {
      customerName: "Amina Bello",
      customerEmail: "amina.b@example.com",
      rating: 5,
      headline: "My sister loved this gift so much!",
      comment:
        "Bought this as a souvenir gift for my sister's birthday in Abuja. Delivery arrived right on schedule via GIG and she couldn't stop praising the finish. 10/10 recommendation!",
      photoUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80",
      isVerifiedBuyer: true,
      helpfulVotes: 19,
    },
    {
      customerName: "Emeka Nwosu",
      customerEmail: "emeka.n@example.com",
      rating: 4,
      headline: "Very satisfied with the purchase",
      comment:
        "Great value for money. Minor delay with courier rider due to Lagos Island traffic, but the product itself is flawless and well finished.",
      photoUrl: null,
      isVerifiedBuyer: true,
      helpfulVotes: 5,
    },
  ];

  for (const product of products) {
    for (const rev of sampleReviews) {
      await prisma.productReview.create({
        data: {
          product_id: product.id,
          customer_name: rev.customerName,
          customer_email: rev.customerEmail,
          rating: rev.rating,
          headline: rev.headline,
          comment: rev.comment,
          photo_url: rev.photoUrl,
          is_verified_buyer: rev.isVerifiedBuyer,
          is_approved: true,
          helpful_votes: rev.helpfulVotes,
        },
      });
    }
  }

  console.log(`[Reviews] Successfully seeded sample reviews for ${products.length} products.`);
}
