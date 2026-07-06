import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BOARD_COLUMNS } from "@/lib/boards";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      assignee: true,
      createdBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
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
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  if (body.column !== undefined && !BOARD_COLUMNS[existing.boardType].includes(body.column)) {
    return NextResponse.json({ error: `Invalid column for ${existing.boardType} board` }, { status: 400 });
  }

  const card = await prisma.card.update({
    where: { id },
    data: {
      ...(body.column !== undefined && { column: body.column }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.archived !== undefined && { archived: body.archived }),
    },
    include: { assignee: true, createdBy: true },
  });
  return NextResponse.json(card);
}
