import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCurrentWeek, isNominationOpen } from "@/lib/week";

const MAX_MANUAL_VOTES = 2;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { nominationId } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const week = await getCurrentWeek(user?.office || "US");

  if (!isNominationOpen(week.status, user?.office || "US")) {
    return NextResponse.json({ error: "Voting is closed for this week" }, { status: 400 });
  }

  // Check if user has a nomination this week (must nominate to participate)
  const userNomination = await prisma.nomination.findUnique({
    where: { userId_weekId: { userId: session.userId, weekId: week.id } },
  });
  if (!userNomination) {
    return NextResponse.json({ error: "You must nominate an item before voting" }, { status: 400 });
  }

  // Can't vote for own nomination
  if (nominationId === userNomination.id) {
    return NextResponse.json({ error: "You can't manually vote for your own item" }, { status: 400 });
  }

  // Check nomination exists, is for this week, and is READY
  const nomination = await prisma.nomination.findFirst({
    where: { id: nominationId, weekId: week.id, status: "READY" },
  });
  if (!nomination) {
    return NextResponse.json({ error: "Nomination not found or still loading" }, { status: 404 });
  }

  // Check if already voted for this nomination
  const existingVote = await prisma.vote.findUnique({
    where: { userId_nominationId: { userId: session.userId, nominationId } },
  });
  if (existingVote) {
    return NextResponse.json({ error: "You already voted for this item" }, { status: 400 });
  }

  // Check manual vote count
  const manualVoteCount = await prisma.vote.count({
    where: { userId: session.userId, weekId: week.id, isAutoVote: false },
  });
  if (manualVoteCount >= MAX_MANUAL_VOTES) {
    return NextResponse.json({ error: "You've used all 2 of your votes" }, { status: 400 });
  }

  await prisma.vote.create({
    data: {
      userId: session.userId,
      nominationId,
      weekId: week.id,
      isAutoVote: false,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { nominationId } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const week = await getCurrentWeek(user?.office || "US");

  if (!isNominationOpen(week.status, user?.office || "US")) {
    return NextResponse.json({ error: "Voting is closed for this week" }, { status: 400 });
  }

  const vote = await prisma.vote.findUnique({
    where: { userId_nominationId: { userId: session.userId, nominationId } },
  });

  if (!vote || vote.isAutoVote) {
    return NextResponse.json({ error: "Cannot remove this vote" }, { status: 400 });
  }

  await prisma.vote.delete({ where: { id: vote.id } });

  return NextResponse.json({ success: true });
}
