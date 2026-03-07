import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getWeekBounds } from "@/lib/week";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const office = admin.office;

  // Close any open week
  const openWeek = await prisma.week.findFirst({
    where: { office, status: "OPEN" },
  });

  if (openWeek) {
    await prisma.week.update({
      where: { id: openWeek.id },
      data: { status: "CLOSED" },
    });
  }

  // Find the latest week to increment the number
  const latestWeek = await prisma.week.findFirst({
    where: { office },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  const nextWeekNum = latestWeek ? latestWeek.weekNumber + 1 : 1;
  const year = latestWeek ? latestWeek.year : new Date().getFullYear();

  // Use proper timezone-aware bounds
  const { monday, friday } = getWeekBounds(office);

  const newWeek = await prisma.week.create({
    data: {
      weekNumber: nextWeekNum,
      year,
      office,
      startsAt: monday,
      endsAt: friday,
      status: "OPEN",
    },
  });

  return NextResponse.json({ week: newWeek });
}
