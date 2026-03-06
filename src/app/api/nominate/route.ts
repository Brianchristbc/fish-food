import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { scrapeAmazonProduct, extractAsin, parsePrice } from "@/lib/tinyfish";
import { getCurrentWeek, isNominationOpen, getLastWeekWinner } from "@/lib/week";

const MAX_PRICE = 49.98;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { amazonUrl } = await req.json();

  if (!amazonUrl || !amazonUrl.includes("amazon.com")) {
    return NextResponse.json({ error: "Must be an Amazon URL" }, { status: 400 });
  }

  const asin = extractAsin(amazonUrl);
  if (!asin) {
    return NextResponse.json({ error: "Could not extract product ID from URL" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const office = user?.office || "US";

  // Check if this item won last week
  const lastWinner = await getLastWeekWinner(office);
  if (lastWinner && lastWinner.asin === asin) {
    return NextResponse.json({
      error: "This item won last week and cannot be nominated again this week",
    }, { status: 400 });
  }

  const week = await getCurrentWeek(office);

  if (!isNominationOpen(week.status)) {
    return NextResponse.json({ error: "Nominations are closed for this week" }, { status: 400 });
  }

  // Check if user already nominated this week
  const existing = await prisma.nomination.findUnique({
    where: { userId_weekId: { userId: session.userId, weekId: week.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "You already nominated an item this week" }, { status: 400 });
  }

  // Create nomination in PENDING state — return immediately
  const nomination = await prisma.nomination.create({
    data: {
      userId: session.userId,
      weekId: week.id,
      amazonUrl,
      asin,
      status: "PENDING",
    },
  });

  // Fire off TFWA scrape in the background (don't await)
  processNomination(nomination.id, amazonUrl, asin, session.userId, week.id).catch((err) => {
    console.error("Background nomination processing failed:", err);
  });

  return NextResponse.json({ success: true, nomination: { id: nomination.id, status: "PENDING" } });
}

async function processNomination(
  nominationId: string,
  amazonUrl: string,
  asin: string,
  userId: string,
  weekId: string,
) {
  try {
    const product = await scrapeAmazonProduct(amazonUrl);
    const price = parsePrice(product.price);

    if (price <= 0) {
      await prisma.nomination.update({
        where: { id: nominationId },
        data: { status: "FAILED", errorMsg: "Could not determine product price" },
      });
      return;
    }

    if (price > MAX_PRICE) {
      await prisma.nomination.update({
        where: { id: nominationId },
        data: {
          status: "FAILED",
          errorMsg: `Item price ($${price.toFixed(2)}) exceeds the $${MAX_PRICE} limit`,
        },
      });
      return;
    }

    await prisma.nomination.update({
      where: { id: nominationId },
      data: {
        productName: product.product_name,
        price,
        imageUrl: product.image_url,
        status: "READY",
      },
    });

    // Auto-vote for own nomination
    await prisma.vote.create({
      data: {
        userId,
        nominationId,
        weekId,
        isAutoVote: true,
      },
    });
  } catch {
    await prisma.nomination.update({
      where: { id: nominationId },
      data: { status: "FAILED", errorMsg: "Failed to fetch product info from Amazon" },
    });
  }
}
