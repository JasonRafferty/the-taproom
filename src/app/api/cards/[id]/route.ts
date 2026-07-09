import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BOARD_COLUMNS, isBoardType, USER_SUMMARY_SELECT, type BoardType } from "@/lib/boards";
import { formatZodError, updateCardSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      assignee: { select: USER_SUMMARY_SELECT },
      createdBy: { select: USER_SUMMARY_SELECT },
      comments: {
        include: { author: { select: USER_SUMMARY_SELECT } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  return NextResponse.json(card);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const boardType = String(existing.boardType);
  if (!isBoardType(boardType)) {
    return NextResponse.json({ error: "Card has an invalid board type" }, { status: 500 });
  }

  const data = parsed.data;
  if (data.column !== undefined && !BOARD_COLUMNS[boardType as BoardType].includes(data.column)) {
    return NextResponse.json({ error: `Invalid column for ${boardType} board` }, { status: 400 });
  }

  if (data.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId }, select: { id: true } });
    if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
  }

  const card = await prisma.card.update({
    where: { id },
    data: {
      ...(data.column !== undefined && { column: data.column }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.archived !== undefined && { archived: data.archived }),
    },
    include: {
      assignee: { select: USER_SUMMARY_SELECT },
      createdBy: { select: USER_SUMMARY_SELECT },
    },
  });
  return NextResponse.json(card);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  await prisma.card.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
