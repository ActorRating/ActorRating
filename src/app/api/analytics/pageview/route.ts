import { NextRequest, NextResponse } from "next/server"
import type { BotCategory } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getClientIp } from "@/lib/requestProtection"
import { hashIp } from "@/lib/analytics/ip-hash"
import { resolveBotCategory } from "@/lib/analytics/bot-category"
import { detectInternalFleetCrawl, detectInternalPathCrawl } from "@/lib/analytics/internal-crawl"
import {
  evaluatePageViewBot,
  normalizePageViewPath,
  parseUtmParams,
  truncateReferrer,
} from "@/lib/analytics/pageview"
import { normalizeInviteCode } from "@/lib/invites"
import {
  AR_SRC_COOKIE,
  arSrcCookieOptions,
  isValidSource,
  normalizeAcquisitionSource,
} from "@/lib/tracking/source"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Body = {
  path?: unknown
  search?: unknown
  referrer?: unknown
}

function emptyOk(cookieSource?: string | null) {
  const res = new NextResponse(null, { status: 204 })
  if (cookieSource && isValidSource(cookieSource)) {
    res.cookies.set(AR_SRC_COOKIE, cookieSource, arSrcCookieOptions())
  }
  return res
}

async function flagSiblingsAsBots(siblingIds: string[]) {
  if (siblingIds.length === 0) return

  const siblings = await prisma.pageView.findMany({
    where: { id: { in: siblingIds }, isLikelyBot: false },
    select: { id: true, userAgent: true },
  })
  if (siblings.length === 0) return

  const byCategory = new Map<BotCategory, string[]>()
  for (const s of siblings) {
    const cat = resolveBotCategory(true, s.userAgent) ?? "UNIDENTIFIED"
    const list = byCategory.get(cat)
    if (list) list.push(s.id)
    else byCategory.set(cat, [s.id])
  }

  for (const [botCategory, ids] of byCategory) {
    await prisma.pageView.updateMany({
      where: { id: { in: ids } },
      data: { isLikelyBot: true, botCategory },
    })
  }
}

/**
 * First-party pageview beacon. Failures never surface to the client —
 * always 204 so logging cannot break navigation.
 *
 * First-touch acquisition: if utm_source (or src) is tiktok/instagram/youtube/x
 * and ar_src is not already set, set the cookie (30 days).
 */
export async function POST(request: NextRequest) {
  let attributionToSet: string | null = null

  try {
    let body: Body = {}
    try {
      body = (await request.json()) as Body
    } catch {
      return emptyOk()
    }

    const pathBase = normalizePageViewPath(typeof body.path === "string" ? body.path : "")
    if (!pathBase) {
      return emptyOk()
    }

    // Never log our own beacon / auth APIs as "pages"
    if (pathBase.startsWith("/api/")) {
      return emptyOk()
    }

    const search = typeof body.search === "string" ? body.search : ""
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    )

    // Preserve invite code on register landings so Traffic / Invites can attribute hits.
    let path = pathBase
    if (pathBase === "/auth/register") {
      const inviteCode = normalizeInviteCode(params.get("code"))
      if (inviteCode) {
        path = `/auth/register?code=${inviteCode}`.slice(0, 500)
      }
    }

    const { utmSource, utmMedium, utmCampaign } = parseUtmParams(params)

    // Prefer utm_source; allow ?src=tiktok|instagram|youtube|x on any landing URL
    const srcParam = normalizeAcquisitionSource(params.get("src"))
    const candidate = normalizeAcquisitionSource(utmSource) ?? srcParam
    const existing = request.cookies.get(AR_SRC_COOKIE)?.value
    if (candidate && !isValidSource(existing)) {
      attributionToSet = candidate
    }

    // Persist acquisition channel on the pageview (dashboard UTM breakdown).
    // ?src=x counts the same as ?utm_source=x (?src=twitter → x).
    const storedUtmSource =
      normalizeAcquisitionSource(utmSource) ?? srcParam ?? utmSource

    const referrer = truncateReferrer(
      typeof body.referrer === "string"
        ? body.referrer
        : request.headers.get("referer"),
    )
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 1000)
    const acceptLanguage = request.headers.get("accept-language")
    const ipHash = hashIp(getClientIp(request))

    const bot = evaluatePageViewBot({
      path,
      userAgent,
      acceptLanguage,
      ipHash,
    })

    let isLikelyBot = bot.isLikelyBot
    let siblingIds: string[] = []

    let userId: string | null = null
    try {
      const session = await auth()
      userId = session?.user?.id ?? null
    } catch {
      userId = null
    }

    try {
      const crawl = await detectInternalPathCrawl(prisma, ipHash, {
        path,
        referrer,
        utmSource: storedUtmSource,
        utmMedium,
        utmCampaign,
      })
      if (crawl.isCrawl) {
        isLikelyBot = true
        siblingIds = crawl.siblingIds
      }
    } catch {
      // Crawl detection must not block logging
    }

    try {
      const fleet = await detectInternalFleetCrawl(prisma, {
        path,
        referrer,
        utmSource: storedUtmSource,
        utmMedium,
        utmCampaign,
        ipHash,
        userId,
      })
      if (fleet.isFleet) {
        isLikelyBot = true
        siblingIds = [...new Set([...siblingIds, ...fleet.siblingIds])]
      }
    } catch {
      // Fleet detection must not block logging
    }

    const botCategory = resolveBotCategory(isLikelyBot, userAgent)

    await prisma.pageView.create({
      data: {
        path,
        referrer,
        utmSource: storedUtmSource,
        utmMedium,
        utmCampaign,
        userId,
        ipHash,
        userAgent,
        isLikelyBot,
        botCategory,
      },
    })

    try {
      await flagSiblingsAsBots(siblingIds)
    } catch {
      // Non-fatal
    }
  } catch {
    // Swallow — analytics must never break the product
  }

  return emptyOk(attributionToSet)
}
