import type { NextRequest } from "next/server"
import { isInvalidResourceParam } from "@/lib/requestProtection"
import { checkSharedRateLimit } from "@/lib/analytics/rate-limit"
import {
  detectClientSignalFlags,
  detectHeaderInconsistencies,
  type ClientSignals,
  type HeaderGetter,
} from "@/lib/analytics/request-signals"

/** Substrings that usually mean a crawler / automated client. */
export const BOT_UA_SUBSTRINGS = [
  "bot",
  "spider",
  "crawl",
  "scrapy",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "httpclient",
  "go-http-client",
  "java/",
  "okhttp",
  "headless",
  "phantomjs",
  "puppeteer",
  "playwright",
  "selenium",
  "bytespider",
  "semrush",
  "ahrefs",
  "petalbot",
  "yandex",
  "bingpreview",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "embedly",
  "quora link preview",
  "applebot",
  "duckduckbot",
  "baiduspider",
  "sogou",
  "exabot",
  "ia_archiver",
] as const

/** Malformed / junk paths we've seen from scrapers and broken clients. */
const JUNK_PATH_PATTERNS: RegExp[] = [
  /\/(null|undefined|nan)(\/|$)/i,
  /^\/rate\/-\d{4}/i,
  /^\/movies\/-\d{4}/i,
  /^\/actors\/-\d{4}/i,
  /^\/api\//i,
]

const PAGEVIEW_WINDOW_MS = 60_000
const PAGEVIEW_MAX_PER_IP = 30
const pageViewIpWindow = new Map<string, { count: number; resetAt: number }>()

export type PageViewBotInput = {
  path: string
  userAgent: string
  acceptLanguage: string | null
  ipHash: string
  /** Request headers for sec-ch-ua / sec-fetch consistency checks (optional). */
  headers?: HeaderGetter | null
  /** Sanitized client-side signals from the beacon body (optional). */
  clientSignals?: ClientSignals | null
  /** Cloudflare verified-bot flag (Transform Rule header). */
  cloudflareVerifiedBot?: boolean
  /** Result of the async burst check, when the caller already ran it. */
  ipBurst?: boolean
}

export type PageViewBotReason =
  | "user_agent"
  | "missing_accept_language"
  | "junk_path"
  | "ip_burst"
  | "cf_verified_bot"
  | "ua_hint_mismatch"
  | "headless_hint"
  | "missing_sec_fetch"
  | "cross_site_beacon"
  | "mobile_hint_mismatch"
  | "webdriver"
  | "zero_screen"

export type PageViewBotResult = {
  isLikelyBot: boolean
  reasons: PageViewBotReason[]
}

/** Join reasons for the `botReason` column (120 chars). */
export function formatBotReason(reasons: readonly string[]): string | null {
  if (reasons.length === 0) return null
  return [...new Set(reasons)].join(",").slice(0, 120)
}

export function userAgentLooksLikeBot(userAgent: string): boolean {
  const ua = userAgent.trim()
  if (!ua) return true
  const lower = ua.toLowerCase()
  return BOT_UA_SUBSTRINGS.some((s) => lower.includes(s))
}

export function pathLooksLikeJunk(path: string): boolean {
  if (!path || path.length > 2000) return true
  if (JUNK_PATH_PATTERNS.some((re) => re.test(path))) return true

  // /rate/:movieSlug/:actorSlug — reject literal junk segments
  const rateParts = path.split("/").filter(Boolean)
  if (rateParts[0] === "rate" && rateParts.length >= 3) {
    if (isInvalidResourceParam(rateParts[1]) || isInvalidResourceParam(rateParts[2])) {
      return true
    }
  }
  return false
}

/**
 * True when this ipHash exceeded the pageview write budget (still log, flag as bot).
 * Shared across instances via Upstash when configured; memory fallback otherwise.
 */
export async function isPageViewBurst(ipHash: string): Promise<boolean> {
  const ok = await checkSharedRateLimit("pv", ipHash, {
    windowMs: PAGEVIEW_WINDOW_MS,
    maxRequests: PAGEVIEW_MAX_PER_IP,
  }, pageViewIpWindow)
  return !ok
}

/**
 * Pure bot evaluation. Burst detection is async and must be passed in via
 * `ipBurst` (see `isPageViewBurst`) — this function never touches I/O.
 */
export function evaluatePageViewBot(input: PageViewBotInput): PageViewBotResult {
  const reasons: PageViewBotReason[] = []

  if (input.cloudflareVerifiedBot) {
    reasons.push("cf_verified_bot")
  }
  if (userAgentLooksLikeBot(input.userAgent)) {
    reasons.push("user_agent")
  }
  if (!input.acceptLanguage?.trim()) {
    reasons.push("missing_accept_language")
  }
  if (pathLooksLikeJunk(input.path)) {
    reasons.push("junk_path")
  }
  if (input.ipBurst) {
    reasons.push("ip_burst")
  }
  if (input.headers) {
    for (const r of detectHeaderInconsistencies(input.headers, input.userAgent)) {
      reasons.push(r)
    }
  }
  for (const r of detectClientSignalFlags(input.clientSignals ?? null)) {
    reasons.push(r)
  }

  return {
    isLikelyBot: reasons.length > 0,
    reasons,
  }
}

/** Extract UTM params from a query string or URLSearchParams. */
export function parseUtmParams(
  search: string | URLSearchParams | null | undefined,
): {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
} {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search ?? new URLSearchParams()

  const clip = (v: string | null, max: number) => {
    const t = v?.trim()
    if (!t) return null
    return t.slice(0, max)
  }

  const sourceRaw = clip(params.get("utm_source"), 100)
  return {
    utmSource: sourceRaw ? sourceRaw.toLowerCase() : null,
    utmMedium: clip(params.get("utm_medium"), 100),
    utmCampaign: clip(params.get("utm_campaign"), 200),
    utmTerm: clip(params.get("utm_term"), 200),
    utmContent: clip(params.get("utm_content"), 200),
  }
}

/** Normalize path for storage (pathname only, leading slash, no host). */
export function normalizePageViewPath(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).pathname || "/"
    }
  } catch {
    return null
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  // Strip query/hash if a client accidentally sent them in path
  const q = path.indexOf("?")
  const h = path.indexOf("#")
  const end =
    q === -1 && h === -1 ? path.length : Math.min(q === -1 ? path.length : q, h === -1 ? path.length : h)
  return path.slice(0, end).slice(0, 500) || "/"
}

export function truncateReferrer(referrer: string | null | undefined): string | null {
  const t = referrer?.trim()
  if (!t) return null
  return t.slice(0, 1000)
}

/** Helper for tests / demos: header-based evaluation without the burst window. */
export function evaluatePageViewBotFromRequest(
  request: NextRequest,
  path: string,
  ipHash: string,
): PageViewBotResult {
  return evaluatePageViewBot({
    path,
    userAgent: request.headers.get("user-agent") || "",
    acceptLanguage: request.headers.get("accept-language"),
    ipHash,
    headers: request.headers,
  })
}
