import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { USER_SUMMARY_SELECT } from "@/lib/boards";
import { createCommentSchema, formatZodError } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({ where: { id }, select: { id: true } });
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const comments = await prisma.comment.findMany({
    where: { cardId: id },
    include: { author: { select: USER_SUMMARY_SELECT } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(comments);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const comment = await prisma.comment.create({
    data: { cardId: id, authorId: user.id, text: parsed.data.text },
    include: { author: { select: USER_SUMMARY_SELECT } },
  });
  return NextResponse.json(comment, { status: 201 });
}
