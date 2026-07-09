import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { USER_SUMMARY_SELECT } from "@/lib/boards";
import { createDecisionSchema, formatZodError } from "@/lib/validation";

export async function GET() {
  const decisions = await prisma.decision.findMany({
    where: { status: { not: "RESOLVED" } },
    include: { owner: { select: USER_SUMMARY_SELECT } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(decisions);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;
  if (data.ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: data.ownerId }, select: { id: true } });
    if (!owner) return NextResponse.json({ error: "Owner not found" }, { status: 400 });
  }

  const decision = await prisma.decision.create({
    data: {
      title: data.title,
      note: data.note ?? null,
      ownerId: data.ownerId ?? null,
      status: data.status ?? "OPEN",
    },
    include: { owner: { select: USER_SUMMARY_SELECT } },
  });
  return NextResponse.json(decision, { status: 201 });
}
