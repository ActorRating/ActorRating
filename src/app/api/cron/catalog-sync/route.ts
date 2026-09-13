export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runDailyCatalogSync } from "@/lib/catalog/daily-catalog-sync"

function authorize(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || process.env.EDITORIAL_CRON_SECRET || "").trim()
  if (!secret) return false

  const auth = request.headers.get("authorization") || ""
  if (auth === `Bearer ${secret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  return querySecret === secret
}

function cronEnabled(): boolean {
  // Default ON — set CATALOG_SYNC_CRON_ENABLED=false to disable.
  return process.env.CATALOG_SYNC_CRON_ENABLED !== "false"
}

/**
 * Daily TMDB catalog sync: now-playing + upcoming + recent releases →
 * full cast ingest + filmography expand for new top-billed actors.
 *
 * Coolify Scheduled Task (daily, e.g. 06:00 UTC):
 *   node scripts/run-catalog-sync-cron.js
 *
 * Or:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://actorrating.com/api/cron/catalog-sync
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!cronEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "CATALOG_SYNC_CRON_ENABLED=false",
    })
  }

  if (!process.env.TMDB_API_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, error: "TMDB_API_KEY is not set" },
      { status: 503 },
    )
  }

  try {
    const result = await runDailyCatalogSync(prisma)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[catalog-sync]", msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
