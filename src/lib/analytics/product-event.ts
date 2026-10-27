import type { BotCategory } from "@prisma/client"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getClientIp } from "@/lib/requestProtection"
import { hashIp } from "@/lib/analytics/ip-hash"
import { resolveBotCategory } from "@/lib/analytics/bot-category"
import {
  evaluatePageViewBot,
  normalizePageViewPath,
} from "@/lib/analytics/pageview"
import { checkSharedRateLimit } from "@/lib/analytics/rate-limit"
import { extractRequestAnalyticsSignals } from "@/lib/analytics/request-signals"
import { peekVisitorSession } from "@/lib/analytics/visitor-session"
import { normalizeAcquisitionSource } from "@/lib/tracking/source"
import {
  PRODUCT_EVENT_IP_HOUR_MAX,
  PRODUCT_EVENT_IP_HOUR_WINDOW_MS,
  QUALIFIED_VISIT_DEDUPE_WINDOW_MS,
  QUALIFIED_VISIT_PAGEVIEW_LOOKBACK_MS,
  gateQualifiedVisitPersist,
} from "@/lib/analytics/qualified-visit-persist"

export const TRACKED_PRODUCT_EVENTS = [
  "performance_viewed",
  "rating_slider_moved",
  "rating_submitted",
  "signup_started",
  "search_used",
  "qualified_visit",
  "hub_view",
  "hub_rate_click",
  "home_rate_click",
  "faceoff_started",
  "faceoff_matchup_viewed",
  "faceoff_vote_submitted",
  "faceoff_results_viewed",
  "faceoff_continued",
  "faceoff_shared",
  "faceoff_signup_started",
  "faceoff_signup_completed",
  "faceoff_returned",
  "faceoff_homepage_click",
] as const

export type TrackedProductEventName = (typeof TRACKED_PRODUCT_EVENTS)[number]

export function isTrackedProductEvent(
  value: string,
): value is TrackedProductEventName {
  return (TRACKED_PRODUCT_EVENTS as readonly string[]).includes(value)
}

export type ProductEventBody = {
  name?: unknown
  path?: unknown
  actor?: unknown
  movie?: unknown
  source?: unknown
  utm_source?: unknown
  utm_medium?: unknown
  utm_campaign?: unknown
  utm_term?: unknown
  utm_content?: unknown
  properties?: unknown
}

export type PersistProductEventResult = {
  /** HTTP status for the beacon response. */
  status: 204 | 429
  stored: boolean
}

const productEventIpHourWindow = new Map<
  string,
  { count: number; resetAt: number }
>()

function clipString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function sanitizeProperties(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== "string") continue
    const k = key.slice(0, 64)
    if (typeof raw === "string") out[k] = raw.slice(0, 500)
    else if (typeof raw === "number" && Number.isFinite(raw)) out[k] = raw
    else if (typeof raw === "boolean") out[k] = raw
  }
  return Object.keys(out).length > 0 ? out : null
}

/** Test seam: reset the process-local product-event IP hour window. */
export function resetProductEventIpHourWindowForTests(): void {
  productEventIpHourWindow.clear()
}

export async function persistProductEvent(
  request: NextRequest,
  body: ProductEventBody,
): Promise<PersistProductEventResult> {
  const name = clipString(body.name, 80)
  if (!name || !isTrackedProductEvent(name)) {
    return { status: 204, stored: false }
  }

  const path = normalizePageViewPath(
    typeof body.path === "string" ? body.path : "",
  )
  if (path?.startsWith("/api/")) {
    return { status: 204, stored: false }
  }

  const source =
    normalizeAcquisitionSource(clipString(body.source, 50)) ??
    normalizeAcquisitionSource(clipString(body.utm_source, 100))
  const utmSource =
    normalizeAcquisitionSource(clipString(body.utm_source, 100)) ?? source
  const utmMedium = clipString(body.utm_medium, 100)
  const utmCampaign = clipString(body.utm_campaign, 200)
  const utmTerm = clipString(body.utm_term, 200)
  const utmContent = clipString(body.utm_content, 200)
  const actor = clipString(body.actor, 200)
  const movie = clipString(body.movie, 200)
  const clientProperties = sanitizeProperties(body.properties)

  const userAgent = (request.headers.get("user-agent") || "").slice(0, 1000)
  const acceptLanguage = request.headers.get("accept-language")
  const ipHash = hashIp(getClientIp(request))
  const { visitorId, sessionId } = peekVisitorSession(request)

  // Cap all product events per IP (60 / hour). Over budget → 429, no write.
  const underBudget = await checkSharedRateLimit(
    "pe",
    ipHash,
    {
      windowMs: PRODUCT_EVENT_IP_HOUR_WINDOW_MS,
      maxRequests: PRODUCT_EVENT_IP_HOUR_MAX,
    },
    productEventIpHourWindow,
  )
  if (!underBudget) {
    return { status: 429, stored: false }
  }

  const signals = extractRequestAnalyticsSignals(request)
  const properties = {
    ...(clientProperties ?? {}),
    accept_language_present: signals.acceptLanguagePresent,
    sec_fetch_present: signals.secFetchPresent,
    ...(signals.country ? { country: signals.country } : {}),
  }

  const bot = evaluatePageViewBot({
    path: path ?? "/",
    userAgent,
    acceptLanguage,
    ipHash,
    headers: request.headers,
    cloudflareVerifiedBot: signals.cloudflareVerifiedBot,
  })

  let isLikelyBot = bot.isLikelyBot
  let engagedPageViewId: string | null = null

  if (name === "qualified_visit") {
    const qPath = path ?? "/"
    const dedupeSince = new Date(Date.now() - QUALIFIED_VISIT_DEDUPE_WINDOW_MS)
    const pageviewSince = new Date(
      Date.now() - QUALIFIED_VISIT_PAGEVIEW_LOOKBACK_MS,
    )
    const claimedPageViewId =
      typeof clientProperties?.pageview_id === "string"
        ? clientProperties.pageview_id.slice(0, 64)
        : null
    // Identity for matching: visitor cookie when present, else IP.
    const identity = visitorId ? { OR: [{ visitorId }, { ipHash }] } : { ipHash }

    const [recentDuplicate, matchingPageView] = await Promise.all([
      prisma.productEvent.findFirst({
        where: {
          name: "qualified_visit",
          ...identity,
          path: qPath,
          createdAt: { gte: dedupeSince },
        },
        select: { id: true },
      }),
      claimedPageViewId
        ? prisma.pageView.findFirst({
            where: {
              id: claimedPageViewId,
              ...identity,
              createdAt: { gte: pageviewSince },
            },
            select: { id: true, isLikelyBot: true },
          })
        : prisma.pageView.findFirst({
            where: {
              ...identity,
              path: qPath,
              createdAt: { gte: pageviewSince },
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, isLikelyBot: true },
          }),
    ])

    const gate = gateQualifiedVisitPersist({
      hasRecentDuplicate: Boolean(recentDuplicate),
      matchingPageView: matchingPageView
        ? { isLikelyBot: matchingPageView.isLikelyBot }
        : null,
      evaluateBotIsLikelyBot: bot.isLikelyBot,
    })

    if (!gate.accept) {
      return { status: 204, stored: false }
    }
    isLikelyBot = gate.isLikelyBot
    if (!isLikelyBot && matchingPageView) {
      engagedPageViewId = matchingPageView.id
    }
  }

  let userId: string | null = null
  try {
    const session = await auth()
    userId = session?.user?.id ?? null
  } catch {
    userId = null
  }

  const botCategory: BotCategory | null = resolveBotCategory(
    isLikelyBot,
    userAgent,
  )

  await prisma.productEvent.create({
    data: {
      name,
      path,
      actor,
      movie,
      source,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      userId,
      ipHash,
      userAgent,
      isLikelyBot,
      botCategory,
      visitorId,
      sessionId,
    },
  })

  // Positive human proof flows back to the PageView row (Human / Unknown split).
  if (engagedPageViewId) {
    const dwell =
      typeof clientProperties?.dwell_ms === "number" &&
      Number.isFinite(clientProperties.dwell_ms)
        ? Math.max(0, Math.min(Math.round(clientProperties.dwell_ms), 6 * 60 * 60 * 1000))
        : null
    const interaction =
      typeof clientProperties?.interaction === "string"
        ? clientProperties.interaction.slice(0, 20)
        : null
    try {
      await markPageViewEngaged(engagedPageViewId, { dwellMs: dwell, interaction })
    } catch {
      // Non-fatal: the qualified_visit row is already stored.
    }
  }

  return { status: 204, stored: true }
}

/** Set engaged=true and raise dwell/interaction on a PageView row (never lowers dwell). */
export async function markPageViewEngaged(
  pageViewId: string,
  input: { dwellMs: number | null; interaction: string | null },
): Promise<void> {
  const current = await prisma.pageView.findUnique({
    where: { id: pageViewId },
    select: { dwellMs: true, interaction: true },
  })
  if (!current) return
  const dwellMs =
    input.dwellMs == null
      ? current.dwellMs
      : Math.max(current.dwellMs ?? 0, input.dwellMs)
  await prisma.pageView.update({
    where: { id: pageViewId },
    data: {
      engaged: true,
      dwellMs,
      interaction: current.interaction ?? input.interaction,
    },
  })
}
