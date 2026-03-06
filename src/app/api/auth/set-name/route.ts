import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const VALID_OFFICES = ["US", "VN"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { name, office } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const selectedOffice = VALID_OFFICES.includes(office) ? office : "US";

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { name: name.trim(), office: selectedOffice },
    select: { id: true, email: true, name: true, office: true },
  });

  return NextResponse.json({ user });
}
