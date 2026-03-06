import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getCurrentWeek } from "@/lib/week";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const week = await getCurrentWeek(admin.office);

  if (week.status === "CLOSED" && week.winningNominationId) {
    const winner = await prisma.nomination.findUnique({
      where: { id: week.winningNominationId },
      include: { user: { select: { email: true, name: true } } },
    });
    return NextResponse.json({ alreadyClosed: true, winner });
  }

  const nominations = await prisma.nomination.findMany({
    where: { weekId: week.id, status: "READY" },
    include: {
      votes: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (nominations.length === 0) {
    await prisma.week.update({
      where: { id: week.id },
      data: { status: "CLOSED" },
    });
    return NextResponse.json({ winner: null, message: "No nominations this week" });
  }

  const withCounts = nominations.map((n) => ({ ...n, voteCount: n.votes.length }));
  const maxVotes = Math.max(...withCounts.map((n) => n.voteCount));
  const topNominations = withCounts.filter((n) => n.voteCount === maxVotes);
  const winner = topNominations[Math.floor(Math.random() * topNominations.length)];

  await prisma.week.update({
    where: { id: week.id },
    data: { status: "CLOSED", winningNominationId: winner.id },
  });

  return NextResponse.json({
    winner: {
      productName: winner.productName,
      price: winner.price,
      imageUrl: winner.imageUrl,
      amazonUrl: winner.amazonUrl,
      nominatedBy: winner.user.name || winner.user.email.split("@")[0],
      voteCount: winner.voteCount,
    },
  });
}
