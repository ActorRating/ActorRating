export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

import { NextRequest, NextResponse } from "next/server"
import { runDiscoveryEngine } from "@/lib/arie/discovery/run"

function authorize(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || process.env.EDITORIAL_CRON_SECRET || "").trim()
  if (!secret) return false

  const auth = request.headers.get("authorization") || ""
  if (auth === `Bearer ${secret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  return querySecret === secret
}

/**
 * Periodic discovery run — Coolify scheduled task every 5–10 minutes when enabled.
 *
 * Requires ARIE_DISCOVERY_ENABLED=true and CRON_SECRET.
 *
 * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *   https://actorrating.com/api/cron/arie-discovery
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await runDiscoveryEngine({ triggeredBy: "cron" })
  return NextResponse.json(result)
}
