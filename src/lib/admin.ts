import { prisma } from "./db";
import { getSession } from "./auth";

const ADMIN_EMAIL = "brianchristian@tinyfish.io";

export async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.email !== ADMIN_EMAIL) return null;

  return user;
}
