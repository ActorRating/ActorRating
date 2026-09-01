export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { loadLandingRails } from "@/lib/landing-daily-rails"
import { secondsUntilNextUtcMidnight } from "@/lib/daily-rail-picks"
import { checkRateLimit } from "@/lib/rateLimit"
import { getClientIp, isLikelyAbusiveBot } from "@/lib/requestProtection"

function isTrustedSameOriginRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite === "same-origin") return true

  const referer = request.headers.get("referer")
  if (!referer) return false

  try {
    return new URL(referer).origin === request.nextUrl.origin
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    if (isLikelyAbusiveBot(request) && !isTrustedSameOriginRequest(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const clientIp = getClientIp(request)
    const limit = await checkRateLimit(clientIp, "byLookup")
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const payload = await loadLandingRails()
    const maxAge = secondsUntilNextUtcMidnight()
    const response = NextResponse.json(payload)
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${maxAge}, stale-while-revalidate=3600`,
    )
    return response
  } catch (error) {
    console.error("[LANDING-RAILS API] GET ERROR:", error)
    return NextResponse.json({ error: "Failed to load rails" }, { status: 500 })
  }
}
