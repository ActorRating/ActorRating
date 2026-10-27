import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getClientIp } from "@/lib/requestProtection"
import { hashIp } from "@/lib/analytics/ip-hash"
import { normalizePageViewPath } from "@/lib/analytics/pageview"
import { checkSharedRateLimit } from "@/lib/analytics/rate-limit"
import { peekVisitorSession } from "@/lib/analytics/visitor-session"
import { shouldSkipAnalyticsStorage } from "@/lib/analytics/internal-traffic"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DWELL_LOOKBACK_MS = 6 * 60 * 60 * 1000
const DWELL_MAX_MS = 6 * 60 * 60 * 1000
const DWELL_IP_HOUR_MAX = 240
const dwellIpHourWindow = new Map<string, { count: number; resetAt: number }>()

type Body = {
  id?: unknown
  path?: unknown
  dwellMs?: unknown
  interaction?: unknown
}

const INTERACTIONS = new Set(["pointermove", "touchstart", "scroll", "keydown"])

/**
 * Time-on-page beacon sent on pagehide / route change via sendBeacon.
 * Only raises `dwellMs` (never lowers it) and fills `interaction` on the
 * matching PageView row. Does NOT set `engaged` — that stays server-gated
 * through qualified_visit. Always 204.
 */
export async function POST(request: NextRequest) {
  try {
    let sessionEmail: string | null = null
    try {
      const authSession = await auth()
      sessionEmail = authSession?.user?.email ?? null
    } catch {
      sessionEmail = null
    }
    if (shouldSkipAnalyticsStorage(request, sessionEmail)) {
      return new NextResponse(null, { status: 204 })
    }

    let body: Body = {}
    try {
      body = (await request.json()) as Body
    } catch {
      return new NextResponse(null, { status: 204 })
    }

    const dwellRaw = typeof body.dwellMs === "number" ? body.dwellMs : NaN
    if (!Number.isFinite(dwellRaw) || dwellRaw < 0) {
      return new NextResponse(null, { status: 204 })
    }
    const dwellMs = Math.min(Math.round(dwellRaw), DWELL_MAX_MS)
    const interaction =
      typeof body.interaction === "string" && INTERACTIONS.has(body.interaction)
        ? body.interaction
        : null

    const ipHash = hashIp(getClientIp(request))
    const ok = await checkSharedRateLimit(
      "dw",
      ipHash,
      { windowMs: 60 * 60 * 1000, maxRequests: DWELL_IP_HOUR_MAX },
      dwellIpHourWindow,
    )
    if (!ok) return new NextResponse(null, { status: 204 })

    const { visitorId } = peekVisitorSession(request)
    const identity = visitorId ? { OR: [{ visitorId }, { ipHash }] } : { ipHash }
    const since = new Date(Date.now() - DWELL_LOOKBACK_MS)

    const claimedId = typeof body.id === "string" ? body.id.slice(0, 64) : null
    const path = normalizePageViewPath(typeof body.path === "string" ? body.path : "")

    const row = claimedId
      ? await prisma.pageView.findFirst({
          where: { id: claimedId, ...identity, createdAt: { gte: since } },
          select: { id: true, dwellMs: true, interaction: true },
        })
      : path
        ? await prisma.pageView.findFirst({
            where: { ...identity, path, createdAt: { gte: since } },
            orderBy: { createdAt: "desc" },
            select: { id: true, dwellMs: true, interaction: true },
          })
        : null

    if (!row) return new NextResponse(null, { status: 204 })

    const nextDwell = Math.max(row.dwellMs ?? 0, dwellMs)
    if (nextDwell === (row.dwellMs ?? 0) && (row.interaction || !interaction)) {
      return new NextResponse(null, { status: 204 })
    }

    await prisma.pageView.update({
      where: { id: row.id },
      data: {
        dwellMs: nextDwell,
        interaction: row.interaction ?? interaction,
      },
    })
  } catch {
    // Swallow — analytics must never break the product
  }
  return new NextResponse(null, { status: 204 })
}
