# Fish Food

Weekly office purchase voting app powered by the [TinyFish Web Agent](https://tinyfish.ai).

Every week, team members nominate an Amazon item they want the office to buy. Everyone votes, and the winning item gets purchased on Friday. Built for the TinyFish company hackathon.

## How It Works

1. **Sign in** with your @tinyfish.io email (2FA verification code)
2. **Nominate** an Amazon product by pasting the URL — the TinyFish Web Agent navigates to Amazon, scrapes the product name, price, and image, and validates it's under the $49.98 cap
3. **Vote** on 2 other items (your own nomination gets 1 auto-vote)
4. **Hype** your picks on Slack with custom messages to rally votes
5. **Winner announced** Friday at 5pm — the item gets purchased and arrives Monday
6. **Next week** starts fresh, but the previous winner can't win back-to-back

## TinyFish Web Agent Integration

The core hackathon showcase: TFWA acts as the product validation layer. When a user submits an Amazon URL, we fire off an async request to the TinyFish Web Agent API. The agent launches a browser, navigates to the product page, extracts structured data (name, price, image, availability), and returns it — all described in plain English, no selectors needed.

This replaces what would otherwise require fragile Amazon scraping, an official API integration, or manual price verification.

## Tech Stack

- **Next.js 16** (App Router) — full-stack React
- **PostgreSQL** (Supabase) — database
- **Prisma 7** — ORM with pg adapter
- **TinyFish Web Agent** — Amazon product scraping & price validation
- **Resend** — 2FA email delivery
- **Slack Incoming Webhooks** — vote rallying & item hype
- **iron-session** — cookie-based auth sessions
- **Tailwind CSS v4** — styling

## Features

- Email 2FA restricted to @tinyfish.io
- Async product scraping (submit instantly, TFWA works in background)
- Per-office voting pools (US, Vietnam, China)
- Slack integration with custom hype messages
- Admin panel for week management (open/close/reopen any week)
- Previous winner ban (same ASIN can't win consecutive weeks)
- Week browser for viewing past nomination history

## Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your keys (see below)

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start dev server
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string (pooled, port 6543) |
| `DIRECT_URL` | Supabase Postgres direct connection (port 5432, for migrations) |
| `TINYFISH_API_KEY` | TinyFish Web Agent API key |
| `RESEND_API_KEY` | Resend email API key |
| `SESSION_SECRET` | Random 32+ char string for cookie encryption |
| `NEXT_PUBLIC_APP_URL` | Deployed app URL (for Slack links) |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL |

## Deploy

Hosted on Vercel with Supabase Postgres. Push to `main` to deploy.

## Admin

Navigate to `/admin` (restricted to brianchristian@tinyfish.io) to:
- Open/close/reopen any week
- Create new weeks for testing
- View all nominations and vote counts
- Pick winners with random tiebreaking
