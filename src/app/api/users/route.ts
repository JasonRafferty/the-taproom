import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { USER_SUMMARY_SELECT } from "@/lib/boards";

export async function GET() {
  const users = await prisma.user.findMany({
    select: USER_SUMMARY_SELECT,
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json(users);
}
