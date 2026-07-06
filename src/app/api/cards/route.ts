import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isBoardType, BOARD_COLUMNS, USER_SUMMARY_SELECT } from "@/lib/boards";

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
  const boardType = body?.boardType;
  const title = body?.title;
  if (!boardType || !isBoardType(boardType) || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "boardType and non-empty title are required" }, { status: 400 });
  }

  const card = await prisma.card.create({
    data: {
      boardType,
      title: title.trim(),
      column: BOARD_COLUMNS[boardType][0],
      description: body?.description ?? null,
      assigneeId: body?.assigneeId ?? null,
      priority: body?.priority ?? null,
      dueDate: body?.dueDate ? new Date(body.dueDate) : null,
      createdById: user.id,
    },
    include: {
      assignee: { select: USER_SUMMARY_SELECT },
      createdBy: { select: USER_SUMMARY_SELECT },
    },
  });
  return NextResponse.json(card, { status: 201 });
}
