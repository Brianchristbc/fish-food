import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const HYPE_PHRASES = [
  "is campaigning HARD for",
  "really wants the team to get",
  "is making their case for",
  "needs YOUR vote for",
  "is rallying support for",
  "believes the office NEEDS",
  "won't stop talking about",
  "is on a mission to win votes for",
];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!SLACK_WEBHOOK_URL) {
    return NextResponse.json({ error: "Slack integration not configured" }, { status: 500 });
  }

  const { nominationId, type, message } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const displayName = user?.name || user?.email?.split("@")[0] || "Someone";

  if (type === "rally") {
    const week = await prisma.week.findFirst({
      where: { status: "OPEN" },
      include: { nominations: { where: { status: "READY" } } },
    });

    const count = week?.nominations.length || 0;
    const customLine = message ? `\n\n_"${message}"_ — ${displayName}` : "";

    await postToSlack({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${displayName}* is calling all hands! :rotating_light:\n\nOnly *${count}* nomination${count !== 1 ? "s" : ""} so far this week. The more items, the better the vote!${customLine}\n\n:point_right: <${APP_URL}|*Nominate your pick now*>`,
          },
        },
        { type: "divider" },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: ":fish: *Fish Food* — Weekly team purchase voting" },
          ],
        },
      ],
    });

    return NextResponse.json({ success: true });
  }

  // "hype" type
  if (!nominationId) {
    return NextResponse.json({ error: "nominationId required" }, { status: 400 });
  }

  const nomination = await prisma.nomination.findUnique({
    where: { id: nominationId },
    include: { user: { select: { name: true, email: true } }, votes: true },
  });

  if (!nomination || nomination.status !== "READY") {
    return NextResponse.json({ error: "Nomination not found" }, { status: 404 });
  }

  const nominator = nomination.user.name || nomination.user.email.split("@")[0];
  const phrase = HYPE_PHRASES[Math.floor(Math.random() * HYPE_PHRASES.length)];
  const isOwnItem = nomination.userId === session.userId;

  const headline = isOwnItem
    ? `*${displayName}* ${phrase}`
    : `*${displayName}* is hyping up *${nominator}'s* pick:`;

  const customLine = message ? `\n\n_"${message}"_` : "";

  await postToSlack({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${headline}\n\n:package: *${nomination.productName}*\n:moneybag: $${nomination.price.toFixed(2)}\n:ballot_box: ${nomination.votes.length} vote${nomination.votes.length !== 1 ? "s" : ""} so far${customLine}`,
        },
        accessory: {
          type: "image",
          image_url: nomination.imageUrl,
          alt_text: nomination.productName,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Cast your vote" },
            url: APP_URL,
            style: "primary",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "View on Amazon" },
            url: nomination.amazonUrl,
          },
        ],
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: ":fish: *Fish Food* — Weekly team purchase voting" },
        ],
      },
    ],
  });

  return NextResponse.json({ success: true });
}

async function postToSlack(payload: Record<string, unknown>) {
  await fetch(SLACK_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
