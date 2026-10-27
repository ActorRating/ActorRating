import { NextRequest, NextResponse } from "next/server"
import type { BotCategory, Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getClientIp } from "@/lib/requestProtection"
import { hashIp } from "@/lib/analytics/ip-hash"
import { resolveBotCategory } from "@/lib/analytics/bot-category"
import {
  detectInternalEntityCrawl,
  detectInternalFleetCrawl,
  detectInternalPathCrawl,
  hasHumanEngagementSignal,
  listUnflagableCrawlPageViewIds,
  unflagCrawlPageViews,
} from "@/lib/analytics/internal-crawl"
import {
  evaluatePageViewBot,
  formatBotReason,
  isPageViewBurst,
  normalizePageViewPath,
  parseUtmParams,
  truncateReferrer,
} from "@/lib/analytics/pageview"
import {
  extractRequestAnalyticsSignals,
  parseClientSignals,
} from "@/lib/analytics/request-signals"
import {
  applyVisitorSessionCookies,
  readVisitorSession,
} from "@/lib/analytics/visitor-session"
import { shouldSkipAnalyticsStorage } from "@/lib/analytics/internal-traffic"
import { normalizeInviteCode } from "@/lib/invites"
import {
  applyPageviewAttributionCookies,
  AR_UTM_CAMPAIGN_COOKIE,
} from "@/lib/tracking/attribution-cookies"
import {
  AR_SRC_COOKIE,
  inferAcquisitionSourceFromReferrer,
  isValidSource,
  normalizeAcquisitionSource,
} from "@/lib/tracking/source"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Body = {
  path?: unknown
  search?: unknown
  referrer?: unknown
  /** Client-side signals (webdriver, screen, tz, …) — see parseClientSignals. */
  signals?: unknown
}

type AttributionToSet = {
  source: string
  utmSource?: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm?: string | null
  utmContent: string | null
  existingSource?: string | null
} | null

type ResponseExtras = {
  attribution?: AttributionToSet
  campaign?: { utmCampaign: string | null; existingCampaign: string | null }
  identity?: { visitorId: string; sessionId: string } | null
}

/**
 * 204 when nothing was stored, 200 `{ id }` when a PageView row was written so
 * the client can attach dwell / qualified_visit to the exact row.
 */
function respond(pageViewId: string | null, extras: ResponseExtras = {}) {
  const res = pageViewId
    ? NextResponse.json({ id: pageViewId }, { status: 200 })
    : new NextResponse(null, { status: 204 })
  applyPageviewAttributionCookies(res, {
    attribution: extras.attribution,
    utmCampaign: extras.campaign?.utmCampaign,
    existingCampaign: extras.campaign?.existingCampaign,
  })
  if (extras.identity) {
    applyVisitorSessionCookies(res, extras.identity)
  }
  return res
}

async function flagSiblingsAsBots(siblingIds: string[], reason: string) {
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
      data: { isLikelyBot: true, botCategory, botReason: reason },
    })
  }
}

/**
 * First-party pageview beacon. Failures never surface to the client —
 * always 2xx so logging cannot break navigation.
 *
 * Identity: signed `ar_vid` (1y) + rolling `ar_sid` (30m) cookies are read and
 * refreshed on every beacon; both are stored on the row for session metrics.
 *
 * First-touch acquisition: prefer tagged utm_source / ?src=, else infer from
 * organic referrer (google / bing / x / …). Sets ar_src for 30 days when unset.
 * utm_campaign is stored in its own cookie when that cookie is empty, even if
 * ar_src is already set or the source is not a recognized channel.
 */
export async function POST(request: NextRequest) {
  let campaignFromUrl: string | null = null
  const existingCampaign = request.cookies.get(AR_UTM_CAMPAIGN_COOKIE)?.value ?? null
  let attributionToSet: AttributionToSet = null
  let identity: { visitorId: string; sessionId: string } | null = null
  let createdId: string | null = null

  try {
    let body: Body = {}
    try {
      body = (await request.json()) as Body
    } catch {
      return respond(null)
    }

    const pathBase = normalizePageViewPath(typeof body.path === "string" ? body.path : "")
    if (!pathBase) {
      return respond(null)
    }

    // Never log our own beacon / auth APIs as "pages"
    if (pathBase.startsWith("/api/")) {
      return respond(null)
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

    const { utmSource, utmMedium, utmCampaign, utmTerm, utmContent } = parseUtmParams(params)
    campaignFromUrl = utmCampaign

    const referrer = truncateReferrer(
      typeof body.referrer === "string"
        ? body.referrer
        : request.headers.get("referer"),
    )

    // Prefer tagged utm_source / ?src=; fall back to organic referrer (Google, Bing, X, …)
    const srcParam = normalizeAcquisitionSource(params.get("src"))
    const candidate =
      normalizeAcquisitionSource(utmSource) ??
      srcParam ??
      inferAcquisitionSourceFromReferrer(referrer)
    const existing = request.cookies.get(AR_SRC_COOKIE)?.value
    if (candidate && !isValidSource(existing)) {
      attributionToSet = {
        source: candidate,
        utmSource: utmSource ?? candidate,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        existingSource: isValidSource(existing) ? existing : null,
      }
    }

    // Persist acquisition channel on the pageview (dashboard UTM breakdown).
    // ?src=x counts the same as ?utm_source=x (?src=twitter → x).
    const storedUtmSource =
      normalizeAcquisitionSource(utmSource) ?? srcParam ?? utmSource

    const userAgent = (request.headers.get("user-agent") || "").slice(0, 1000)
    const acceptLanguage = request.headers.get("accept-language")
    const ipHash = hashIp(getClientIp(request))

    const session = readVisitorSession(request)
    identity = { visitorId: session.visitorId, sessionId: session.sessionId }

    let userId: string | null = null
    let sessionEmail: string | null = null
    try {
      const authSession = await auth()
      userId = authSession?.user?.id ?? null
      sessionEmail = authSession?.user?.email ?? null
    } catch {
      userId = null
      sessionEmail = null
    }

    // Internal traffic: still refresh ar_vid/ar_sid + attribution cookies, skip DB row.
    if (shouldSkipAnalyticsStorage(request, sessionEmail)) {
      return respond(null, {
        attribution: attributionToSet,
        campaign: { utmCampaign: campaignFromUrl, existingCampaign },
        identity,
      })
    }

    const requestSignals = extractRequestAnalyticsSignals(request)
    const clientSignals = parseClientSignals(body.signals)

    let ipBurst = false
    try {
      ipBurst = await isPageViewBurst(ipHash)
    } catch {
      ipBurst = false
    }

    const bot = evaluatePageViewBot({
      path,
      userAgent,
      acceptLanguage,
      ipHash,
      headers: request.headers,
      clientSignals,
      cloudflareVerifiedBot: requestSignals.cloudflareVerifiedBot,
      ipBurst,
    })

    let isLikelyBot = bot.isLikelyBot
    const reasons: string[] = [...bot.reasons]
    let siblingIds: string[] = []
    let siblingReason = "crawl_sibling"

    // Path/entity crawl softens for IPs/visitors with recent human product signals.
    // Fleet detection is unchanged and does not use this exemption.
    let humanExempt = false
    try {
      humanExempt = await hasHumanEngagementSignal(prisma, ipHash, session.visitorId)
    } catch {
      humanExempt = false
    }

    const crawlCurrent = {
      path,
      referrer,
      utmSource: storedUtmSource,
      utmMedium,
      utmCampaign,
      userId,
    }

    try {
      const crawl = await detectInternalPathCrawl(prisma, ipHash, crawlCurrent, { humanExempt })
      if (crawl.isCrawl) {
        isLikelyBot = true
        reasons.push("crawl_path")
        siblingReason = "crawl_path"
        siblingIds = crawl.siblingIds
      }
    } catch {
      // Crawl detection must not block logging
    }

    try {
      const entity = await detectInternalEntityCrawl(prisma, ipHash, crawlCurrent, { humanExempt })
      if (entity.isCrawl) {
        isLikelyBot = true
        reasons.push("crawl_entity")
        siblingReason = "crawl_entity"
        siblingIds = [...new Set([...siblingIds, ...entity.siblingIds])]
      }
    } catch {
      // Entity crawl detection must not block logging
    }

    try {
      const fleet = await detectInternalFleetCrawl(prisma, { ...crawlCurrent, ipHash, userId })
      if (fleet.isFleet) {
        isLikelyBot = true
        reasons.push("crawl_fleet")
        siblingReason = "crawl_fleet"
        siblingIds = [...new Set([...siblingIds, ...fleet.siblingIds])]
      }
    } catch {
      // Fleet detection must not block logging
    }

    const botCategory = resolveBotCategory(isLikelyBot, userAgent, reasons)

    const created = await prisma.pageView.create({
      data: {
        path,
        referrer,
        utmSource: storedUtmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        userId,
        ipHash,
        userAgent,
        isLikelyBot,
        botCategory,
        botReason: isLikelyBot ? formatBotReason(reasons) : null,
        visitorId: session.visitorId,
        sessionId: session.sessionId,
        country: requestSignals.country,
        clientSignals: clientSignals
          ? (clientSignals as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      select: { id: true },
    })
    createdId = created.id

    try {
      if (humanExempt) {
        // Previously crawl-flagged siblings → human again; never re-flag this pass.
        const unflagIds = await listUnflagableCrawlPageViewIds(prisma, ipHash, session.visitorId)
        await unflagCrawlPageViews(prisma, unflagIds)
      } else {
        await flagSiblingsAsBots(siblingIds, siblingReason)
      }
    } catch {
      // Non-fatal
    }
  } catch {
    // Swallow — analytics must never break the product
  }

  return respond(createdId, {
    attribution: attributionToSet,
    campaign: { utmCampaign: campaignFromUrl, existingCampaign },
    identity,
  })
}
