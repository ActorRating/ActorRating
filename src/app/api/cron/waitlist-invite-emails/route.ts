export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"

const DISABLED_MESSAGE =
  "Waitlist invite cron disabled — registration is open; no beta invite emails are sent."

function authorize(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || "").trim()
  if (!secret) return false

  const auth = request.headers.get("authorization") || ""
  if (auth === `Bearer ${secret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  return querySecret === secret
}

/**
 * Legacy waitlist beta-invite sender — permanently disabled with open registration.
 * Kept as a no-op so Coolify cron configs fail safe without sending CINEMA2026 emails.
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    disabled: true,
    reason: DISABLED_MESSAGE,
    due: 0,
    sent: 0,
    failed: 0,
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
