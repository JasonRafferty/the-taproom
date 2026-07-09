import { notFound } from "next/navigation";
import { slugToBoardType, BOARD_LABELS, BOARD_PURPOSE } from "@/lib/boards";
import { getCurrentUser } from "@/lib/auth";
import BoardView from "@/components/Board/BoardView";

export default async function BoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const boardType = slugToBoardType(slug);
  if (!boardType) notFound();

  const user = await getCurrentUser();
  if (!user) notFound(); // unreachable in practice — middleware redirects unauthenticated requests first

  return (
    <BoardView
      boardType={boardType}
      label={BOARD_LABELS[boardType]}
      purpose={BOARD_PURPOSE[boardType]}
    />
  );
}
