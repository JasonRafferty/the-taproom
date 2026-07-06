import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TERMINAL_COLUMN } from "@/lib/boards";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [assignedCards, dueSoon, recentCandidates, quickLinks] = await Promise.all([
    prisma.card.findMany({
      where: { assigneeId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.card.findMany({
      where: { archived: false, dueDate: { not: null } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.card.findMany({
      where: { archived: false },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.link.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const myOpenCards = assignedCards.filter((card) => card.column !== TERMINAL_COLUMN[card.boardType]);
  const recentlyCompleted = recentCandidates
    .filter((card) => card.column === TERMINAL_COLUMN[card.boardType])
    .slice(0, 5);

  return NextResponse.json({ myOpenCards, dueSoon, recentlyCompleted, quickLinks });
}
