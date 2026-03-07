import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getWeekBounds, getNextWeekBounds } from "@/lib/week";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Support creating weeks for any office via query param
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

  // Determine bounds: use current week if still open, otherwise next week
  const now = new Date();
  const currentBounds = getWeekBounds(office);
  const useNext = now > currentBounds.friday;
  const bounds = useNext ? getNextWeekBounds(office) : currentBounds;

  // Find the latest week to determine the next week number
  const latestWeek = await prisma.week.findFirst({
    where: { office },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  const nextWeekNum = latestWeek ? latestWeek.weekNumber + 1 : 1;
  const year = latestWeek ? latestWeek.year : new Date().getFullYear();

  // Check if this week number already exists (avoid duplicates)
  const existing = await prisma.week.findUnique({
    where: { weekNumber_year_office: { weekNumber: nextWeekNum, year, office } },
  });

  if (existing) {
    // Reopen it instead of creating a duplicate
    const reopened = await prisma.week.update({
      where: { id: existing.id },
      data: { status: "OPEN", winningNominationId: null, startsAt: bounds.monday, endsAt: bounds.friday },
    });
    return NextResponse.json({ week: reopened });
  }

  const newWeek = await prisma.week.create({
    data: {
      weekNumber: nextWeekNum,
      year,
      office,
      startsAt: bounds.monday,
      endsAt: bounds.friday,
      status: "OPEN",
    },
  });

  return NextResponse.json({ week: newWeek });
}
