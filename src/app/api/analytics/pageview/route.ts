import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getClientIp } from "@/lib/requestProtection"
import { hashIp } from "@/lib/analytics/ip-hash"
import {
  evaluatePageViewBot,
  normalizePageViewPath,
  parseUtmParams,
  truncateReferrer,
} from "@/lib/analytics/pageview"
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

/**
 * First-party pageview beacon. Failures never surface to the client —
 * always 204 so logging cannot break navigation.
 *
 * First-touch acquisition: if utm_source (or src) is tiktok/instagram/youtube
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

    const path = normalizePageViewPath(typeof body.path === "string" ? body.path : "")
    if (!path) {
      return emptyOk()
    }

    // Never log our own beacon / auth APIs as "pages"
    if (path.startsWith("/api/")) {
      return emptyOk()
    }

    const search = typeof body.search === "string" ? body.search : ""
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    )
    const { utmSource, utmMedium, utmCampaign } = parseUtmParams(params)

    // Prefer utm_source; allow legacy ?src=tiktok on any landing URL
    const candidate = normalizeAcquisitionSource(
      utmSource ?? params.get("src"),
    )
    const existing = request.cookies.get(AR_SRC_COOKIE)?.value
    if (candidate && !isValidSource(existing)) {
      attributionToSet = candidate
    }

    // Store normalized source on the pageview when it's a known channel
    const storedUtmSource =
      normalizeAcquisitionSource(utmSource) ?? utmSource

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

    let userId: string | null = null
    try {
      const session = await auth()
      userId = session?.user?.id ?? null
    } catch {
      userId = null
    }

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
        isLikelyBot: bot.isLikelyBot,
      },
    })
  } catch {
    // Swallow — analytics must never break the product
  }

  return emptyOk(attributionToSet)
}
