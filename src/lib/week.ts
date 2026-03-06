import { prisma } from "./db";

// All week bounds are in America/Los_Angeles (Pacific Time)
const TZ = "America/Los_Angeles";

function getDateInTZ(date: Date): { year: number; month: number; day: number; hour: number; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: parseInt(get("year")),
    month: parseInt(get("month")),
    day: parseInt(get("day")),
    hour: parseInt(get("hour")),
    dayOfWeek: dayMap[get("weekday")] ?? 0,
  };
}

function makeDateInTZ(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Create a date string in the target timezone and let the engine parse it
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  // Use a temporary formatter to figure out the UTC offset
  const tempDate = new Date(dateStr + "Z"); // treat as UTC first
  const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = tempDate.toLocaleString("en-US", { timeZone: TZ });
  const utcTime = new Date(utcStr).getTime();
  const tzTime = new Date(tzStr).getTime();
  const offset = utcTime - tzTime;
  return new Date(new Date(dateStr).getTime() + offset);
}

function getWeekBounds(date: Date) {
  const tz = getDateInTZ(date);
  const dayOfWeek = tz.dayOfWeek;
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  // Get Monday's date
  const mondayDate = new Date(date);
  mondayDate.setDate(mondayDate.getDate() + diffToMonday);
  const mondayTZ = getDateInTZ(mondayDate);

  const monday = makeDateInTZ(mondayTZ.year, mondayTZ.month, mondayTZ.day, 9, 0); // Mon 9am PT
  const friday = makeDateInTZ(mondayTZ.year, mondayTZ.month, mondayTZ.day + 4, 16, 50); // Fri 4:50pm PT

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
