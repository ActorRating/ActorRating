export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import {
  checkMemoryIpRateLimit,
  getClientIp,
  isInvalidResourceParam,
  isLikelyAbusiveBot,
} from "@/lib/requestProtection"
import { loadActorPageData } from "@/lib/actor-page-data"

const ACTOR_FETCH_WINDOW_MS = 60 * 1000
const ACTOR_FETCH_MAX_PER_IP = 90
const actorFetchIpWindow = new Map<string, { count: number; resetAt: number }>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isProd = process.env.NODE_ENV === "production"
    const { id } = await params

    // Cheap reject: scrapers / buggy clients hitting /api/actors/null
    if (isInvalidResourceParam(id)) {
      return NextResponse.json({ error: "Invalid actor id" }, { status: 400 })
    }

    if (isLikelyAbusiveBot(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const clientIp = getClientIp(request)
    if (
      !checkMemoryIpRateLimit(actorFetchIpWindow, clientIp, {
        windowMs: ACTOR_FETCH_WINDOW_MS,
        maxRequests: ACTOR_FETCH_MAX_PER_IP,
      })
    ) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const minimal = searchParams.get("minimal") === "true"

    if (!isProd) {
      console.log("🎭 Fetching actor with ID or slug:", id, minimal ? "(minimal)" : "")
    }

    const actorData = await loadActorPageData(id, { minimal })
    if (!actorData) {
      if (!isProd) {
        console.warn("Actor not found:", id)
      }
      return NextResponse.json({ error: "Actor not found" }, { status: 410 })
    }

    if (!isProd) {
      console.log("🎭 Actor found:", actorData.name)
      if (!minimal && "performances" in actorData) {
        console.log(
          "🎭 Returning actor data:",
          actorData.name,
          "with",
          actorData.performances.length,
          "performances (deduped by movie)"
        )
      }
    }

    const res = NextResponse.json(actorData)
    if (minimal) {
      res.headers.set(
        "Cache-Control",
        "public, max-age=300, s-maxage=600, stale-while-revalidate=1800"
      )
    } else if (!isProd) {
      // Prevent browsers from holding a stale actor JSON across reloads.
      res.headers.set("Cache-Control", "no-store, must-revalidate")
    } else {
      res.headers.set(
        "Cache-Control",
        "public, s-maxage=600, stale-while-revalidate=86400"
      )
    }
    return res
  } catch (error) {
    console.error("❌ Error fetching actor:", error)
    return NextResponse.json(
      { error: "Failed to fetch actor" },
      { status: 500 }
    )
  }
}
