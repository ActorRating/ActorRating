export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWaitlistBetaAccessEmail } from "@/lib/waitlistBetaEmail"

const BATCH_SIZE = 25

function authorize(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || "").trim()
  if (!secret) return false

  const auth = request.headers.get("authorization") || ""
  if (auth === `Bearer ${secret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  return querySecret === secret
}

/**
 * Send due waitlist beta-invite emails (scheduled ~3h after join).
 *
 * Coolify Scheduled Task (every 5–15 min):
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://actorrating.com/api/cron/waitlist-invite-emails
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const due = await prisma.waitlistEntry.findMany({
    where: {
      inviteEmailSentAt: null,
      inviteEmailScheduledFor: { lte: now },
    },
    orderBy: { inviteEmailScheduledFor: "asc" },
    take: BATCH_SIZE,
    select: { id: true, email: true },
  })

  let sent = 0
  let failed = 0

  for (const row of due) {
    try {
      await sendWaitlistBetaAccessEmail(row.email)
      await prisma.waitlistEntry.update({
        where: { id: row.id },
        data: { inviteEmailSentAt: new Date() },
      })
      sent += 1
    } catch (error) {
      failed += 1
      console.error("Waitlist invite cron send failed:", row.email, error)
    }
  }

  return NextResponse.json({
    ok: true,
    due: due.length,
    sent,
    failed,
  })
}

/** Allow GET for simpler Coolify / uptime cron configs. */
export async function GET(request: NextRequest) {
  return POST(request)
}
