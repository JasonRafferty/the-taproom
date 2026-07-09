import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { USER_SUMMARY_SELECT } from "@/lib/boards";

const STATUSES = ["OPEN", "DISCUSS", "BLOCKING", "RESOLVED"] as const;
type DecisionStatus = (typeof STATUSES)[number];
function isStatus(v: unknown): v is DecisionStatus {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

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
  const title = body?.title;
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "A non-empty title is required" }, { status: 400 });
  }
  if (body?.status !== undefined && !isStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const decision = await prisma.decision.create({
    data: {
      title: title.trim(),
      note: typeof body?.note === "string" ? body.note : null,
      ownerId: body?.ownerId ?? null,
      status: body?.status ?? "OPEN",
    },
    include: { owner: { select: USER_SUMMARY_SELECT } },
  });
  return NextResponse.json(decision, { status: 201 });
}
