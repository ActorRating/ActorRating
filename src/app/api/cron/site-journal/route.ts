export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 120

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runDailySiteJournal } from "@/lib/editorial/daily-site-journal"

function authorize(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || process.env.EDITORIAL_CRON_SECRET || "").trim()
  if (!secret) return false

  const auth = request.headers.get("authorization") || ""
  if (auth === `Bearer ${secret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  return querySecret === secret
}

function cronEnabled(): boolean {
  // Default ON — set SITE_JOURNAL_CRON_ENABLED=false to disable.
  return process.env.SITE_JOURNAL_CRON_ENABLED !== "false"
}

/**
 * Daily site journal: publishes 1 Story + 1 News (logged-in-rated performance + rotating craft essay).
 *
 * Coolify Scheduled Task (daily, e.g. 05:00 UTC):
 *   node scripts/run-site-journal-cron.js
 *
 * Or:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://actorrating.com/api/cron/site-journal
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!cronEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "SITE_JOURNAL_CRON_ENABLED=false",
    })
  }

  try {
    const result = await runDailySiteJournal(prisma)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const missingTable =
      msg.includes("SiteEditorial") || msg.includes("does not exist") || msg.includes("P2021")
    return NextResponse.json(
      {
        ok: false,
        error: missingTable
          ? "SiteEditorial table missing — run prisma migrate deploy on the server."
          : msg,
      },
      { status: missingTable ? 503 : 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
