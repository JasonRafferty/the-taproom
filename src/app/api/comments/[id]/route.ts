import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  await prisma.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
