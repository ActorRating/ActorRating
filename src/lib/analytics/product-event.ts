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
import { normalizeAcquisitionSource } from "@/lib/tracking/source"

export const TRACKED_PRODUCT_EVENTS = [
  "performance_viewed",
  "rating_slider_moved",
  "rating_submitted",
  "signup_started",
  "search_used",
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
  utm_content?: unknown
  properties?: unknown
}

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

export async function persistProductEvent(
  request: NextRequest,
  body: ProductEventBody,
): Promise<boolean> {
  const name = clipString(body.name, 80)
  if (!name || !isTrackedProductEvent(name)) return false

  const path = normalizePageViewPath(
    typeof body.path === "string" ? body.path : "",
  )
  if (path?.startsWith("/api/")) return false

  const source =
    normalizeAcquisitionSource(clipString(body.source, 50)) ??
    normalizeAcquisitionSource(clipString(body.utm_source, 100))
  const utmSource =
    normalizeAcquisitionSource(clipString(body.utm_source, 100)) ?? source
  const utmMedium = clipString(body.utm_medium, 100)
  const utmCampaign = clipString(body.utm_campaign, 200)
  const utmContent = clipString(body.utm_content, 200)
  const actor = clipString(body.actor, 200)
  const movie = clipString(body.movie, 200)
  const properties = sanitizeProperties(body.properties)

  const userAgent = (request.headers.get("user-agent") || "").slice(0, 1000)
  const acceptLanguage = request.headers.get("accept-language")
  const ipHash = hashIp(getClientIp(request))

  const bot = evaluatePageViewBot({
    path: path ?? "/",
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

  const botCategory: BotCategory | null = resolveBotCategory(
    bot.isLikelyBot,
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
      utmContent,
      properties: properties ?? undefined,
      userId,
      ipHash,
      userAgent,
      isLikelyBot: bot.isLikelyBot,
      botCategory,
    },
  })

  return true
}
