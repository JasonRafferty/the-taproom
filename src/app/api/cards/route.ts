import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isBoardType, BOARD_COLUMNS, USER_SUMMARY_SELECT } from "@/lib/boards";
import { createCardSchema, formatZodError } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const boardType = request.nextUrl.searchParams.get("boardType");
  if (!boardType || !isBoardType(boardType)) {
    return NextResponse.json(
      { error: "boardType query param must be BUG, FEATURE, or TASK" },
      { status: 400 }
    );
  }
  const cards = await prisma.card.findMany({
    where: { boardType, archived: false },
    include: {
      assignee: { select: USER_SUMMARY_SELECT },
      createdBy: { select: USER_SUMMARY_SELECT },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(cards);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;
  if (data.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId }, select: { id: true } });
    if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
  }

  const card = await prisma.card.create({
    data: {
      boardType: data.boardType,
      title: data.title,
      column: BOARD_COLUMNS[data.boardType][0],
      description: data.description ?? null,
      assigneeId: data.assigneeId ?? null,
      priority: data.priority ?? null,
      dueDate: data.dueDate ?? null,
      createdById: user.id,
    },
    include: {
      assignee: { select: USER_SUMMARY_SELECT },
      createdBy: { select: USER_SUMMARY_SELECT },
    },
  });
  return NextResponse.json(card, { status: 201 });
}
