import type { NextRequest } from "next/server"

const BOT_UA_PATTERN =
  /(semrush|ahrefs|mj12bot|dotbot|megaindex|blexbot|yandexbot|petalbot|sogou|bytespider|crawler|spider|scrapy|python-requests|curl|wget)/i

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]?.trim() || "unknown"
  return request.headers.get("x-real-ip") || "unknown"
}

export function isLikelyAbusiveBot(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") || ""
  return BOT_UA_PATTERN.test(ua)
}
