import { prisma } from "./db";

function getWeekBounds(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(9, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(16, 50, 0, 0);

  return { monday, friday };
}

function getISOWeek(date: Date): { weekNumber: number; year: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNumber = Math.round(((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7) + 1;
  return { weekNumber, year: d.getFullYear() };
}

export async function getCurrentWeek(office: string = "US") {
  // First check if there's an open week (covers test weeks too)
  const openWeek = await prisma.week.findFirst({
    where: { office, status: "OPEN" },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  if (openWeek) {
    // Auto-close if past real deadline
    const now = new Date();
    if (now > new Date(openWeek.endsAt)) {
      return await prisma.week.update({
        where: { id: openWeek.id },
        data: { status: "CLOSED" },
      });
    }
    return openWeek;
  }

  // No open week — create one for the current calendar week
  const now = new Date();
  const { weekNumber, year } = getISOWeek(now);
  const { monday, friday } = getWeekBounds(now);

  const existing = await prisma.week.findUnique({
    where: { weekNumber_year_office: { weekNumber, year, office } },
  });

  if (existing) {
    // Already closed for this calendar week; return it as-is
    return existing;
  }

  return await prisma.week.create({
    data: {
      weekNumber,
      year,
      office,
      startsAt: monday,
      endsAt: friday,
      status: "OPEN",
    },
  });
}

export async function getLastWeekWinner(office: string = "US") {
  // Find the most recently closed week with a winner (works for both real and test weeks)
  const lastWeek = await prisma.week.findFirst({
    where: {
      office,
      status: "CLOSED",
      winningNominationId: { not: null },
    },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
    include: {
      nominations: true,
    },
  });

  if (!lastWeek || !lastWeek.winningNominationId) return null;

  return lastWeek.nominations.find((n) => n.id === lastWeek.winningNominationId) || null;
}

export function isNominationOpen(weekStatus: string): boolean {
  if (weekStatus !== "OPEN") return false;
  const now = new Date();
  const { monday, friday } = getWeekBounds(now);
  return now >= monday && now <= friday;
}
