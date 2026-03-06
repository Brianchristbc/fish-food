import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const office = searchParams.get("office") || user?.office || "US";

  const weeks = await prisma.week.findMany({
    where: { office, status: "CLOSED", winningNominationId: { not: null } },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
    take: 10,
  });

  const results = await Promise.all(
    weeks.map(async (w) => {
      const winner = await prisma.nomination.findUnique({
        where: { id: w.winningNominationId! },
        include: { user: { select: { email: true, name: true } }, votes: true },
      });
      return {
        weekNumber: w.weekNumber,
        year: w.year,
        winner: winner
          ? {
              productName: winner.productName,
              price: winner.price,
              imageUrl: winner.imageUrl,
              amazonUrl: winner.amazonUrl,
              nominatedBy: winner.user.name || winner.user.email.split("@")[0],
              voteCount: winner.votes.length,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ results });
}
