import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const postAnswerSchema = z.object({
  question_id: z.string(),
  answer: z.string().min(3, "Answer must be at least 3 characters"),
  answered_by: z.string().optional().default("Aura Concierge"),
});

const patchQuestionSchema = z.object({
  id: z.string(),
  is_approved: z.boolean().optional(),
});

export async function GET() {
  try {
    const questions = await prisma.productQuestion.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sector: { select: { slug: true, name: true } },
          },
        },
        answers: {
          orderBy: { created_at: "asc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      success: true,
      questions: questions.map((q) => ({
        id: q.id,
        customer_name: q.customer_name,
        customer_email: q.customer_email,
        question: q.question,
        is_approved: q.is_approved,
        created_at: q.created_at.toISOString(),
        product: {
          id: q.product.id,
          name: q.product.name,
          slug: q.product.slug,
          sector_slug: q.product.sector.slug,
          sector_name: q.product.sector.name,
        },
        answers: q.answers.map((a) => ({
          id: a.id,
          answered_by: a.answered_by,
          answer: a.answer,
          is_official: a.is_official,
          helpful_count: a.helpful_count,
          created_at: a.created_at.toISOString(),
        })),
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/admin/questions:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch questions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = postAnswerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid answer payload" },
        { status: 400 }
      );
    }

    const { question_id, answer, answered_by } = parsed.data;

    const question = await prisma.productQuestion.findUnique({
      where: { id: question_id },
    });

    if (!question) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    const newAnswer = await prisma.productAnswer.create({
      data: {
        question_id,
        answer: answer.trim(),
        answered_by: answered_by || "Aura Verified Concierge",
        is_official: true,
      },
    });

    return NextResponse.json({ success: true, answer: newAnswer }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/questions:", error);
    return NextResponse.json({ success: false, error: "Failed to post answer" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = patchQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { id, is_approved } = parsed.data;

    const updated = await prisma.productQuestion.update({
      where: { id },
      data: {
        ...(typeof is_approved === "boolean" ? { is_approved } : {}),
      },
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (error) {
    console.error("Error in PATCH /api/admin/questions:", error);
    return NextResponse.json({ success: false, error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Question ID is required" }, { status: 400 });
    }

    await prisma.productQuestion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/admin/questions:", error);
    return NextResponse.json({ success: false, error: "Failed to delete question" }, { status: 500 });
  }
}
