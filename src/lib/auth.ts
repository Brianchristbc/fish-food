import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  email?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "replace-with-a-random-32-char-string-here",
  cookieName: "fish-food-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export function isTinyfishEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@tinyfish.io");
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
