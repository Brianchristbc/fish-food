import { prisma } from "./db";

const OFFICE_TIMEZONES: Record<string, string> = {
  US: "America/Los_Angeles",
  VN: "Asia/Ho_Chi_Minh",
};

function getTZ(office: string): string {
  return OFFICE_TIMEZONES[office] || "America/Los_Angeles";
}

function nowInTZ(tz: string) {
  const now = new Date();
  const str = now.toLocaleString("en-US", { timeZone: tz, hour12: false });
  const [datePart, timePart] = str.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const dayOfWeek = new Date(now.toLocaleString("en-US", { timeZone: tz })).getDay();
  return { year, month, day, hour, minute, dayOfWeek };
}

export function localToUTC(tz: string, year: number, month: number, day: number, hour: number, minute: number): Date {
  const fakeUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const utcStr = fakeUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = fakeUTC.toLocaleString("en-US", { timeZone: tz });
  const diff = new Date(utcStr).getTime() - new Date(tzStr).getTime();
  return new Date(fakeUTC.getTime() + diff);
}

export function getWeekBounds(office: string) {
  const tz = getTZ(office);
  const local = nowInTZ(tz);
  const diffToMonday = local.dayOfWeek === 0 ? -6 : 1 - local.dayOfWeek;
  const mondayDay = local.day + diffToMonday;

  const monday = localToUTC(tz, local.year, local.month, mondayDay, 9, 0);
  const friday = localToUTC(tz, local.year, local.month, mondayDay + 4, 16, 50);

  return { monday, friday };
}

export function getNextWeekBounds(office: string) {
  const tz = getTZ(office);
  const local = nowInTZ(tz);
  const diffToMonday = local.dayOfWeek === 0 ? -6 : 1 - local.dayOfWeek;
  const nextMondayDay = local.day + diffToMonday + 7;

  const monday = localToUTC(tz, local.year, local.month, nextMondayDay, 9, 0);
  const friday = localToUTC(tz, local.year, local.month, nextMondayDay + 4, 16, 50);

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
  // Check for an open week
  const openWeek = await prisma.week.findFirst({
    where: { office, status: "OPEN" },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  if (openWeek) {
    const now = new Date();
    if (now > new Date(openWeek.endsAt)) {
      // Auto-close expired week
      await prisma.week.update({
        where: { id: openWeek.id },
        data: { status: "CLOSED" },
      });
      // Fall through
    } else {
      return openWeek;
    }
  }

  // No open week. Check if we're within Mon 9am - Fri 4:50pm for this office.
  const now = new Date();
  const { monday, friday } = getWeekBounds(office);
  const withinWorkWeek = now >= monday && now <= friday;

  if (withinWorkWeek) {
    // Auto-create a week for the current calendar week
    const { weekNumber, year } = getISOWeek(now);

    const existing = await prisma.week.findUnique({
      where: { weekNumber_year_office: { weekNumber, year, office } },
    });

    if (existing) return existing;

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

  // Outside work hours (weekend/after hours) — return the most recent week (read-only)
  const latestWeek = await prisma.week.findFirst({
    where: { office },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
  });

  if (latestWeek) return latestWeek;

  // No weeks at all — create a placeholder for next week
  const { weekNumber, year } = getISOWeek(now);
  const nextBounds = getNextWeekBounds(office);

  return await prisma.week.create({
    data: {
      weekNumber: weekNumber + 1,
      year,
      office,
      startsAt: nextBounds.monday,
      endsAt: nextBounds.friday,
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

export function isNominationOpen(weekStatus: string, startsAt: Date, endsAt: Date): boolean {
  if (weekStatus !== "OPEN") return false;
  const now = new Date();
  return now >= new Date(startsAt) && now <= new Date(endsAt);
}
