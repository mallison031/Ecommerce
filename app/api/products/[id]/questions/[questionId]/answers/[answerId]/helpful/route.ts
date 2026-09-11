import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; questionId: string; answerId: string } }
) {
  try {
    const { answerId } = params;

    const answer = await prisma.productAnswer.findUnique({
      where: { id: answerId },
    });

    if (!answer) {
      return NextResponse.json({ success: false, error: "Answer not found" }, { status: 404 });
    }

    const updated = await prisma.productAnswer.update({
      where: { id: answerId },
      data: {
        helpful_count: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      helpful_count: updated.helpful_count,
    });
  } catch (error) {
    console.error("Error upvoting answer:", error);
    return NextResponse.json({ success: false, error: "Failed to upvote" }, { status: 500 });
  }
}
