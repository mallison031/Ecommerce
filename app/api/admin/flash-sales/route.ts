import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createFlashSaleSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  discount_percentage: z.number().int().min(1).max(99),
  banner_text: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
  product_ids: z.array(z.string()).min(1, "At least one product must be selected"),
});

const updateFlashSaleSchema = z.object({
  id: z.string(),
  is_active: z.boolean().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  discount_percentage: z.number().int().min(1).max(99).optional(),
  banner_text: z.string().optional(),
  end_time: z.string().optional(),
});

export async function GET() {
  try {
    const flashSales = await prisma.flashSale.findMany({
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price_kobo: true,
                stock_qty: true,
                sector: {
                  select: { name: true, slug: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const now = new Date();
    const formatted = flashSales.map((sale) => {
      let status: "active" | "upcoming" | "ended" = "upcoming";
      if (!sale.is_active || sale.end_time <= now) {
        status = "ended";
      } else if (sale.start_time <= now && sale.end_time > now) {
        status = "active";
      }

      return {
        id: sale.id,
        title: sale.title,
        description: sale.description,
        discount_percentage: sale.discount_percentage,
        banner_text: sale.banner_text,
        start_time: sale.start_time.toISOString(),
        end_time: sale.end_time.toISOString(),
        is_active: sale.is_active,
        status,
        products: sale.products.map((p) => ({
          id: p.product.id,
          name: p.product.name,
          slug: p.product.slug,
          sector_name: p.product.sector.name,
          original_price_kobo: p.product.price_kobo,
          promo_price_kobo: Math.round(p.product.price_kobo * ((100 - sale.discount_percentage) / 100)),
          stock_qty: p.product.stock_qty,
        })),
        created_at: sale.created_at.toISOString(),
      };
    });

    return NextResponse.json({ success: true, flash_sales: formatted });
  } catch (error) {
    console.error("Error in GET /api/admin/flash-sales:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch flash sales" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createFlashSaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { title, description, discount_percentage, banner_text, start_time, end_time, product_ids } = parsed.data;

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: "End time must be strictly after start time" },
        { status: 400 }
      );
    }

    const flashSale = await prisma.flashSale.create({
      data: {
        title,
        description,
        discount_percentage,
        banner_text: banner_text || `⚡ ${title}: ${discount_percentage}% OFF! Limited Time Deal`,
        start_time: startDate,
        end_time: endDate,
        is_active: true,
        products: {
          create: product_ids.map((id) => ({
            product_id: id,
          })),
        },
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, flash_sale: flashSale }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/flash-sales:", error);
    return NextResponse.json({ success: false, error: "Failed to create flash sale" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateFlashSaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const { id, is_active, title, description, discount_percentage, banner_text, end_time } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (typeof is_active === "boolean") updateData.is_active = is_active;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discount_percentage) updateData.discount_percentage = discount_percentage;
    if (banner_text !== undefined) updateData.banner_text = banner_text;
    if (end_time) updateData.end_time = new Date(end_time);

    const updated = await prisma.flashSale.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, flash_sale: updated });
  } catch (error) {
    console.error("Error in PATCH /api/admin/flash-sales:", error);
    return NextResponse.json({ success: false, error: "Failed to update flash sale" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Flash sale ID is required" }, { status: 400 });
    }

    await prisma.flashSale.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Flash sale deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/admin/flash-sales:", error);
    return NextResponse.json({ success: false, error: "Failed to delete flash sale" }, { status: 500 });
  }
}
