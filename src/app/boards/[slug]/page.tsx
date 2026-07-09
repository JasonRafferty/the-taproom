import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { slugToBoardType, BOARD_LABELS, BOARD_PURPOSE, USER_SUMMARY_SELECT } from "@/lib/boards";
import { getCurrentUser } from "@/lib/auth";
import BoardView from "@/components/Board/BoardView";

export default async function BoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const boardType = slugToBoardType(slug);
  if (!boardType) notFound();

  const user = await getCurrentUser();
  if (!user) notFound(); // unreachable in practice — middleware redirects unauthenticated requests first

  const [cards, users] = await Promise.all([
    prisma.card.findMany({
      where: { boardType, archived: false },
      include: {
        assignee: { select: USER_SUMMARY_SELECT },
        createdBy: { select: USER_SUMMARY_SELECT },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      select: USER_SUMMARY_SELECT,
      orderBy: { displayName: "asc" },
    }),
  ]);

  return (
    <BoardView
      boardType={boardType}
      label={BOARD_LABELS[boardType]}
      purpose={BOARD_PURPOSE[boardType]}
      initialCards={cards.map((card) => ({
        ...card,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
        dueDate: card.dueDate?.toISOString() ?? null,
      }))}
      initialUsers={users}
    />
  );
}
