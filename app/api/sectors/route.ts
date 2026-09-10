import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
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

    return NextResponse.json({ sectors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
