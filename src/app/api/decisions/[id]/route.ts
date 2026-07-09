import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { USER_SUMMARY_SELECT } from "@/lib/boards";
import { formatZodError, updateDecisionSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.decision.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Decision not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;
  if (data.ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: data.ownerId }, select: { id: true } });
    if (!owner) return NextResponse.json({ error: "Owner not found" }, { status: 400 });
  }

  const decision = await prisma.decision.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.note !== undefined && { note: data.note }),
      ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
      ...(data.status !== undefined && { status: data.status }),
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
