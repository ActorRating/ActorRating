export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 120

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { reclassifyUnknownPageViews } from "@/lib/analytics/reclassify"

function authorize(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || process.env.EDITORIAL_CRON_SECRET || "").trim()
  if (!secret) return false
  const auth = request.headers.get("authorization") || ""
  if (auth === `Bearer ${secret}`) return true
  return request.nextUrl.searchParams.get("secret") === secret
}

/**
 * Nightly: flag visitors with many pageviews and zero engagement as bots.
 *
 * Coolify Scheduled Task (preferred):
 *   node scripts/run-reclassify-pageviews-cron.js
 * or HTTP:
 *   GET /api/cron/reclassify-pageviews?secret=…  (add &dry=1 to preview)
 */
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const dryRun = request.nextUrl.searchParams.get("dry") === "1"
  try {
    const result = await reclassifyUnknownPageViews(prisma, { dryRun })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("reclassify-pageviews failed", error)
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 })
  }
}
