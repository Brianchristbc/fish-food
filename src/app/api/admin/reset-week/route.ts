import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const office = searchParams.get("office") || admin.office;

  // Close any open week for this office
  const openWeeks = await prisma.week.findMany({
    where: { office, status: "OPEN" },
  });

  for (const w of openWeeks) {
    await prisma.week.update({
      where: { id: w.id },
      data: { status: "CLOSED" },
    });
  }

  // Find the latest week to determine the next week number
  const latestWeek = await prisma.week.findFirst({
    where: { office },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  const nextWeekNum = latestWeek ? latestWeek.weekNumber + 1 : 1;
  const year = latestWeek ? latestWeek.year : new Date().getFullYear();

  // Admin-created weeks are open from NOW until 7 days from now
  // This allows testing anytime (weekends, after hours, etc.)
  const now = new Date();
  const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Check if this week number already exists
  const existing = await prisma.week.findUnique({
    where: { weekNumber_year_office: { weekNumber: nextWeekNum, year, office } },
  });

  if (existing) {
    const reopened = await prisma.week.update({
      where: { id: existing.id },
      data: { status: "OPEN", winningNominationId: null, startsAt: now, endsAt },
    });
    return NextResponse.json({ week: reopened });
  }

  const newWeek = await prisma.week.create({
    data: {
      weekNumber: nextWeekNum,
      year,
      office,
      startsAt: now,
      endsAt,
      status: "OPEN",
    },
  });

  return NextResponse.json({ week: newWeek });
}
