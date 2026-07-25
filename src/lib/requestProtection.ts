import type { NextRequest } from "next/server"

const BOT_UA_PATTERN =
  /(semrush|ahrefs|mj12bot|dotbot|megaindex|blexbot|yandexbot|petalbot|sogou|bytespider|crawler|spider|scrapy|python-requests|curl|wget)/i

/** Path params that are almost always client bugs or scrapers, not real IDs/slugs. */
const INVALID_RESOURCE_PARAMS = new Set([
  "",
  "null",
  "undefined",
  "nan",
  "true",
  "false",
  "[object object]",
])

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]?.trim() || "unknown"
  return request.headers.get("x-real-ip") || "unknown"
}

export function isLikelyAbusiveBot(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") || ""
  return BOT_UA_PATTERN.test(ua)
}

/** True for empty / literal "null" / "undefined" style params — reject before DB. */
export function isInvalidResourceParam(value: string | null | undefined): boolean {
  if (value == null) return true
  const trimmed = value.trim().toLowerCase()
  return INVALID_RESOURCE_PARAMS.has(trimmed)
}

type MemoryWindow = { count: number; resetAt: number }

/**
 * Cheap process-local IP throttle (no DB). Suitable for high-read public GETs.
 * Returns false when the caller should respond 429.
 */
export function checkMemoryIpRateLimit(
  store: Map<string, MemoryWindow>,
  ip: string,
  opts: { windowMs: number; maxRequests: number },
): boolean {
  const now = Date.now()
  const current = store.get(ip)
  if (!current || current.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + opts.windowMs })
    return true
  }
  current.count += 1
  return current.count <= opts.maxRequests
}

