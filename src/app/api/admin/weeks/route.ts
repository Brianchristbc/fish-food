import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET: list all weeks
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const office = searchParams.get("office") || admin.office;

  const weeks = await prisma.week.findMany({
    where: { office },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
    include: {
      nominations: {
        where: { status: "READY" },
        include: {
          user: { select: { name: true, email: true } },
          votes: true,
        },
      },
    },
  });

  const result = weeks.map((w) => ({
    id: w.id,
    weekNumber: w.weekNumber,
    year: w.year,
    office: w.office,
    status: w.status,
    winningNominationId: w.winningNominationId,
    nominations: w.nominations.map((n) => ({
      id: n.id,
      productName: n.productName,
      price: n.price,
      imageUrl: n.imageUrl,
      amazonUrl: n.amazonUrl,
      nominatedBy: n.user.name || n.user.email.split("@")[0],
      voteCount: n.votes.length,
      isWinner: n.id === w.winningNominationId,
    })),
  }));

  return NextResponse.json({ weeks: result });
}

// POST: toggle a specific week open/closed
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { weekId, action } = await req.json();

  if (!weekId || !["open", "close"].includes(action)) {
    return NextResponse.json({ error: "weekId and action (open/close) required" }, { status: 400 });
  }

  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      nominations: {
        where: { status: "READY" },
        include: { votes: true, user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!week) {
    return NextResponse.json({ error: "Week not found" }, { status: 404 });
  }

  if (action === "close" && week.status === "OPEN") {
    // Pick a winner
    let winningNominationId: string | null = null;
    let winnerInfo = null;

    if (week.nominations.length > 0) {
      const withCounts = week.nominations.map((n) => ({
        ...n,
        voteCount: n.votes.length,
      }));
      const maxVotes = Math.max(...withCounts.map((n) => n.voteCount));
      const top = withCounts.filter((n) => n.voteCount === maxVotes);
      const winner = top[Math.floor(Math.random() * top.length)];
      winningNominationId = winner.id;
      winnerInfo = {
        productName: winner.productName,
        price: winner.price,
        imageUrl: winner.imageUrl,
        nominatedBy: winner.user.name || winner.user.email.split("@")[0],
        voteCount: winner.voteCount,
      };
    }

    await prisma.week.update({
      where: { id: weekId },
      data: { status: "CLOSED", winningNominationId },
    });

    return NextResponse.json({ success: true, status: "CLOSED", winner: winnerInfo });
  }

  if (action === "open" && week.status === "CLOSED") {
    // Clear the winner and reopen
    await prisma.week.update({
      where: { id: weekId },
      data: { status: "OPEN", winningNominationId: null },
    });

    return NextResponse.json({ success: true, status: "OPEN" });
  }

  return NextResponse.json({ error: `Week is already ${week.status}` }, { status: 400 });
}
