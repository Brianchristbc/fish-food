import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, isTinyfishEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();

  if (!email || !isTinyfishEmail(email)) {
    return NextResponse.json({ error: "Must use a @tinyfish.io email" }, { status: 400 });
  }

  const authCode = await prisma.authCode.findFirst({
    where: {
      email: email.toLowerCase(),
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!authCode) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  // Mark code as used
  await prisma.authCode.update({
    where: { id: authCode.id },
    data: { used: true },
  });

  // Upsert user
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase() },
  });

  // Set session
  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  return NextResponse.json({ success: true, email: user.email });
}
