export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePerformanceEditorial } from "@/lib/editorial/generate-performance-editorial"
import { listEditorialGenerationQueue } from "@/lib/editorial/editorial-queue"
import { markStaleEditorialsNeedingRegen } from "@/lib/editorial/generate-performance-editorial"

const DEFAULT_LIMIT = 25

function authorize(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || process.env.EDITORIAL_CRON_SECRET || "").trim()
  if (!secret) return false

  const auth = request.headers.get("authorization") || ""
  if (auth === `Bearer ${secret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  return querySecret === secret
}

/**
 * Nightly (or periodic) batch: mark stale hashes, then generate missing/NEEDS_REGEN
 * editorials for highest-rated indexable performances.
 *
 * Coolify Scheduled Task (daily):
 *   node scripts/run-performance-editorial-cron.js
 *
 * Or:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://actorrating.com/api/cron/performance-editorial?limit=50
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : DEFAULT_LIMIT
  const minRatings = Number(request.nextUrl.searchParams.get("minRatings") ?? "1") || 1

  const marked = await markStaleEditorialsNeedingRegen(prisma, 200)
  const queue = await listEditorialGenerationQueue(prisma, { limit, minRatings })

  const results: Array<{ actorId: string; movieId: string; ok: boolean; detail: string }> = []
  let ok = 0
  let fail = 0

  for (const item of queue) {
    const result = await generatePerformanceEditorial(prisma, item.actorId, item.movieId, {
      publish: true,
    })
    if (result.ok) {
      ok += 1
      results.push({
        actorId: item.actorId,
        movieId: item.movieId,
        ok: true,
        detail: `${result.status} ${result.wordCount}w`,
      })
    } else {
      fail += 1
      results.push({
        actorId: item.actorId,
        movieId: item.movieId,
        ok: false,
        detail: result.reason,
      })
    }
  }

  return NextResponse.json({
    markedStale: marked,
    attempted: queue.length,
    ok,
    fail,
    results,
  })
}
