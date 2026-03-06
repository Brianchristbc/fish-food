import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCurrentWeek, isNominationOpen } from "@/lib/week";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const viewOffice = searchParams.get("office") || user?.office || "US";
  const weekId = searchParams.get("weekId");

  // Either fetch a specific week or the current one
  let week;
  if (weekId) {
    week = await prisma.week.findUnique({ where: { id: weekId } });
    if (!week) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }
  } else {
    week = await getCurrentWeek(viewOffice);
  }

  const nominations = await prisma.nomination.findMany({
    where: { weekId: week.id },
    include: {
      user: { select: { email: true, name: true } },
      votes: { select: { userId: true, isAutoVote: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const userVotes = await prisma.vote.findMany({
    where: { userId: session.userId, weekId: week.id, isAutoVote: false },
    select: { nominationId: true },
  });

  const userNomination = await prisma.nomination.findUnique({
    where: { userId_weekId: { userId: session.userId, weekId: week.id } },
  });

  const nominationsWithCounts = nominations.map((n) => ({
    id: n.id,
    productName: n.productName,
    price: n.price,
    imageUrl: n.imageUrl,
    amazonUrl: n.amazonUrl,
    status: n.status,
    errorMsg: n.errorMsg,
    nominatedBy: n.user.name || n.user.email.split("@")[0],
    voteCount: n.votes.length,
    userVoted: n.votes.some((v) => v.userId === session.userId && !v.isAutoVote),
  }));

  // Also return the list of all weeks for this office (for the week picker)
  const allWeeks = await prisma.week.findMany({
    where: { office: week.office },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
    select: { id: true, weekNumber: true, year: true, status: true },
  });

  return NextResponse.json({
    week: {
      id: week.id,
      weekNumber: week.weekNumber,
      year: week.year,
      office: week.office,
      startsAt: week.startsAt,
      endsAt: week.endsAt,
      status: week.status,
    },
    allWeeks,
    nominations: nominationsWithCounts,
    userNomination: userNomination
      ? { id: userNomination.id, productName: userNomination.productName, status: userNomination.status, errorMsg: userNomination.errorMsg }
      : null,
    userManualVotesUsed: userVotes.length,
    userOffice: user?.office || "US",
    viewingOffice: viewOffice,
    isOpen: isNominationOpen(week.status),
  });
}
