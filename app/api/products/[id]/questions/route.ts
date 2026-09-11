import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createAdminAlert } from "@/lib/notifications/admin-alerts";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createQuestionSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Valid email is required").optional().or(z.literal("")),
  question: z.string().min(8, "Question must be at least 8 characters").max(500),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    const questions = await prisma.productQuestion.findMany({
      where: {
        product_id: productId,
        is_approved: true,
      },
      include: {
        answers: {
          orderBy: [{ is_official: "desc" }, { helpful_count: "desc" }],
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      questions: questions.map((q) => ({
        id: q.id,
        customer_name: q.customer_name,
        question: q.question,
        created_at: q.created_at.toISOString(),
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
    console.error("Error fetching product questions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const body = await req.json();
    const parsed = createQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, slug: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const { customer_name, customer_email, question } = parsed.data;

    const newQuestion = await prisma.productQuestion.create({
      data: {
        product_id: product.id,
        customer_name,
        customer_email: customer_email || null,
        question: question.trim(),
        is_approved: true,
      },
    });

    // Notify store admin of new customer question
    try {
      await createAdminAlert({
        type: "ticket_opened",
        title: `💬 New Customer Question on ${product.name}`,
        message: `${customer_name} asked: "${question.slice(0, 80)}${question.length > 80 ? "..." : ""}"`,
        link: `/admin`,
        referenceId: newQuestion.id,
      });
    } catch (alertErr) {
      console.warn("Could not dispatch admin alert for new question:", alertErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your question has been submitted successfully!",
        question: {
          id: newQuestion.id,
          customer_name: newQuestion.customer_name,
          question: newQuestion.question,
          created_at: newQuestion.created_at.toISOString(),
          answers: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting question:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit question" },
      { status: 500 }
    );
  }
}
