import { prisma } from "./db";

// All week bounds are in America/Los_Angeles (Pacific Time)
const TZ = "America/Los_Angeles";

// Get the current time components in Pacific Time
function nowInPT() {
  const now = new Date();
  const str = now.toLocaleString("en-US", { timeZone: TZ, hour12: false });
  // str is like "3/6/2026, 13:29:14"
  const [datePart, timePart] = str.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const dayOfWeek = new Date(now.toLocaleString("en-US", { timeZone: TZ })).getDay();
  return { year, month, day, hour, minute, dayOfWeek, utcNow: now };
}

// Create a UTC Date that represents a specific PT time
function ptToUTC(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Create two dates and compare to find the offset
  const fakeUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const utcStr = fakeUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const ptStr = fakeUTC.toLocaleString("en-US", { timeZone: TZ });
  const diff = new Date(utcStr).getTime() - new Date(ptStr).getTime();
  return new Date(fakeUTC.getTime() + diff);
}

function getWeekBounds(now: Date) {
  const pt = nowInPT();
  const diffToMonday = pt.dayOfWeek === 0 ? -6 : 1 - pt.dayOfWeek;

  const mondayDay = pt.day + diffToMonday;
  const monday = ptToUTC(pt.year, pt.month, mondayDay, 9, 0);     // Mon 9:00am PT
  const friday = ptToUTC(pt.year, pt.month, mondayDay + 4, 16, 50); // Fri 4:50pm PT

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
  const openWeek = await prisma.week.findFirst({
    where: { office, status: "OPEN" },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  if (openWeek) {
    const now = new Date();
    if (now > new Date(openWeek.endsAt)) {
      return await prisma.week.update({
        where: { id: openWeek.id },
        data: { status: "CLOSED" },
      });
    }
    return openWeek;
  }

  const now = new Date();
  const { weekNumber, year } = getISOWeek(now);
  const { monday, friday } = getWeekBounds(now);

  const existing = await prisma.week.findUnique({
    where: { weekNumber_year_office: { weekNumber, year, office } },
  });

  if (existing) {
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
