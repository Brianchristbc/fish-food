import { prisma } from "./db";

const OFFICE_TIMEZONES: Record<string, string> = {
  US: "America/Los_Angeles",
  VN: "Asia/Ho_Chi_Minh",
};

function getTZ(office: string): string {
  return OFFICE_TIMEZONES[office] || "America/Los_Angeles";
}

export function localToUTC(tz: string, year: number, month: number, day: number, hour: number, minute: number): Date {
  const fakeUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const utcStr = fakeUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = fakeUTC.toLocaleString("en-US", { timeZone: tz });
  const diff = new Date(utcStr).getTime() - new Date(tzStr).getTime();
  return new Date(fakeUTC.getTime() + diff);
}

// Get next Friday 4:50pm in the office's timezone
function getNextFriday(office: string): Date {
  const tz = getTZ(office);
  const now = new Date();
  const str = now.toLocaleString("en-US", { timeZone: tz, hour12: false });
  const [datePart] = str.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const dayOfWeek = new Date(now.toLocaleString("en-US", { timeZone: tz })).getDay();

  // Days until next Friday (if today is Fri after deadline or Sat/Sun, go to next Fri)
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0) {
    // It's Friday — check if we're past 4:50pm
    const parts = str.split(", ");
    const [hour, minute] = parts[1].split(":").map(Number);
    if (hour > 16 || (hour === 16 && minute >= 50)) {
      daysUntilFriday = 7; // next Friday
    }
  }

  return localToUTC(tz, year, month, day + daysUntilFriday, 16, 50);
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
      // Fall through to create next week immediately
    } else {
      return openWeek;
    }
  }

  // No open week — create one immediately, closing next Friday 4:50pm
  const now = new Date();
  const friday = getNextFriday(office);

  // Use the Friday's ISO week number for the week label
  const { weekNumber, year } = getISOWeek(friday);

  const existing = await prisma.week.findUnique({
    where: { weekNumber_year_office: { weekNumber, year, office } },
  });

  if (existing && existing.status === "OPEN") {
    return existing;
  }

  if (existing) {
    // Was closed — reopen with new bounds
    return await prisma.week.update({
      where: { id: existing.id },
      data: { status: "OPEN", startsAt: now, endsAt: friday, winningNominationId: null },
    });
  }

  return await prisma.week.create({
    data: {
      weekNumber,
      year,
      office,
      startsAt: now,
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

export function isNominationOpen(weekStatus: string, startsAt: Date, endsAt: Date): boolean {
  if (weekStatus !== "OPEN") return false;
  const now = new Date();
  return now >= new Date(startsAt) && now <= new Date(endsAt);
}
