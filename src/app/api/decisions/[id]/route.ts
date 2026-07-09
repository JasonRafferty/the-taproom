import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { USER_SUMMARY_SELECT } from "@/lib/boards";

const STATUSES = ["OPEN", "DISCUSS", "BLOCKING", "RESOLVED"] as const;
function isStatus(v: unknown): boolean {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.decision.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Decision not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  if (body.status !== undefined && !isStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const decision = await prisma.decision.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.note !== undefined && { note: body.note }),
      ...(body.ownerId !== undefined && { ownerId: body.ownerId }),
      ...(body.status !== undefined && { status: body.status }),
    },
    include: { owner: { select: USER_SUMMARY_SELECT } },
  });
  return NextResponse.json(decision);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.decision.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  await prisma.decision.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
