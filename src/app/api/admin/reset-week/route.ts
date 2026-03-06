import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const office = admin.office;

  const openWeek = await prisma.week.findFirst({
    where: { office, status: "OPEN" },
  });

  if (openWeek) {
    await prisma.week.update({
      where: { id: openWeek.id },
      data: { status: "CLOSED" },
    });
  }

  const latestWeek = await prisma.week.findFirst({
    where: { office },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  const nextWeekNum = latestWeek ? latestWeek.weekNumber + 1 : 1;
  const year = latestWeek ? latestWeek.year : new Date().getFullYear();

  const now = new Date();
  const monday = new Date(now);
  monday.setHours(9, 0, 0, 0);
  const friday = new Date(now);
  friday.setDate(now.getDate() + 4);
  friday.setHours(16, 50, 0, 0);

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
