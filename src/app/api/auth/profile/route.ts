import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, office: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get all nominations by this user
  const nominations = await prisma.nomination.findMany({
    where: { userId: user.id, status: "READY" },
    include: {
      votes: true,
      week: {
        select: { weekNumber: true, year: true, status: true, winningNominationId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const history = nominations.map((n) => ({
    id: n.id,
    productName: n.productName,
    price: n.price,
    imageUrl: n.imageUrl,
    amazonUrl: n.amazonUrl,
    voteCount: n.votes.length,
    weekNumber: n.week.weekNumber,
    year: n.week.year,
    won: n.week.winningNominationId === n.id,
    weekStatus: n.week.status,
  }));

  // Check if user has nominated in the current open week
  const openWeek = await prisma.week.findFirst({
    where: { office: user.office, status: "OPEN" },
  });

  let hasNominatedThisWeek = false;
  if (openWeek) {
    const currentNom = await prisma.nomination.findUnique({
      where: { userId_weekId: { userId: user.id, weekId: openWeek.id } },
    });
    hasNominatedThisWeek = !!currentNom;
  }

  const totalVotesReceived = history.reduce((sum, n) => sum + n.voteCount, 0);
  const totalWins = history.filter((n) => n.won).length;

  return NextResponse.json({
    user,
    history,
    stats: {
      totalNominations: history.length,
      totalVotesReceived,
      totalWins,
    },
    hasNominatedThisWeek,
    hasOpenWeek: !!openWeek,
  });
}
