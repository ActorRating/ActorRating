export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getRecentRatingsFeed } from "@/lib/recent-ratings-feed"
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

/** Public feed for the Just rated ticker on home / discover. */
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

    const items = await getRecentRatingsFeed()
    const response = NextResponse.json({ items })
    response.headers.set(
      "Cache-Control",
      "public, max-age=10, s-maxage=10, stale-while-revalidate=30",
    )
    return response
  } catch (error) {
    console.error("Error fetching recent ratings feed:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
