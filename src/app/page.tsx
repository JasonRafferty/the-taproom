import HomeView from "@/components/Home/HomeView";
import type { Decision } from "@/components/Home/DecisionsPanel";
import { getCurrentUser } from "@/lib/auth";
import { USER_SUMMARY_SELECT } from "@/lib/boards";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return <HomeView initialDecisions={[]} initialUsers={[]} />;

  const [decisions, users] = await Promise.all([
    prisma.decision.findMany({
      where: { status: { not: "RESOLVED" } },
      select: {
        id: true,
        title: true,
        note: true,
        status: true,
        owner: { select: USER_SUMMARY_SELECT },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      select: USER_SUMMARY_SELECT,
      orderBy: { displayName: "asc" },
    }),
  ]);

  return (
    <HomeView
      initialDecisions={decisions.map((decision) => ({
        ...decision,
        status: decision.status as Decision["status"],
      }))}
      initialUsers={users}
    />
  );
}
