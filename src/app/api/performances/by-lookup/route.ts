export const dynamic = "force-dynamic";

// app/api/performances/by-lookup/route.ts

import { NextRequest, NextResponse } from "next/server"
import { getPerformancesByLookup } from "@/lib/performances-by-lookup"
import { checkRateLimit } from "@/lib/rateLimit"
import { getClientIp, isLikelyAbusiveBot } from "@/lib/requestProtection"

export const revalidate = 300

function parseTargets(raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) return null
  return raw
}

export async function GET(request: NextRequest) {
  try {
    if (isLikelyAbusiveBot(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const clientIp = getClientIp(request)
    const limit = await checkRateLimit(clientIp, "byLookup")
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const rawTargets = request.nextUrl.searchParams.get("targets")
    if (!rawTargets) {
      return NextResponse.json({ error: "Missing targets query param" }, { status: 400 })
    }

    const parsed = JSON.parse(rawTargets)
    const targets = parseTargets(parsed)
    if (!targets) {
      return NextResponse.json({ error: "Invalid targets array" }, { status: 400 })
    }

    const performances = await getPerformancesByLookup(targets)
    const response = NextResponse.json({ performances })
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    return response
  } catch (error) {
    console.error("[BY-LOOKUP API] GET ERROR:", error)
    return NextResponse.json({ error: "Failed to fetch performances" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isLikelyAbusiveBot(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const clientIp = getClientIp(request)
    const limit = await checkRateLimit(clientIp, "byLookup")
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = await request.json()
    const targets = parseTargets(body?.targets)

    if (!targets) {
      return NextResponse.json({ error: "Invalid targets array" }, { status: 400 })
    }

    const performances = await getPerformancesByLookup(targets)

    const response = NextResponse.json({ performances })
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    return response
  } catch (error) {
    console.error("[BY-LOOKUP API] ERROR:", error)
    return NextResponse.json({ error: "Failed to fetch performances" }, { status: 500 })
  }
}
