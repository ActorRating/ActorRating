import type { BotCategory } from "@prisma/client"

/**
 * Disclosed / named crawlers and obvious automation clients.
 * Generic browser UAs (even when behaviorally flagged) → UNIDENTIFIED.
 */
export const KNOWN_CRAWLER_UA_SUBSTRINGS = [
  "applebot",
  "googlebot",
  "bingbot",
  "bingpreview",
  "gptbot",
  "chatgpt",
  "oai-searchbot",
  "claudebot",
  "anthropic",
  "meta-externalagent",
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "bytespider",
  "duckduckbot",
  "yandexbot",
  "yandex.com/bots",
  "baiduspider",
  "semrush",
  "ahrefs",
  "petalbot",
  "amazonbot",
  "slurp",
  "ia_archiver",
  "dotbot",
  "mj12bot",
  "blexbot",
  "sogou",
  "exabot",
  "embedly",
  "quora link preview",
  "ccbot",
  "diffbot",
  "imagesiftbot",
  "omgilibot",
  "perplexitybot",
  "youbot",
  "cohere-ai",
  "curl/",
  "wget",
  "python-requests",
  "scrapy",
  "httpclient",
  "go-http-client",
  "java/",
  "okhttp",
  "headlesschrome",
  "phantomjs",
  "puppeteer",
  "playwright",
  "selenium",
] as const

export function isKnownCrawlerUserAgent(userAgent: string | null | undefined): boolean {
  const ua = (userAgent || "").trim().toLowerCase()
  if (!ua) return false
  return KNOWN_CRAWLER_UA_SUBSTRINGS.some((s) => ua.includes(s))
}

/**
 * When isLikelyBot is true, classify as known disclosed crawler vs unidentified
 * (spoofed Chrome/Linux fleet, empty UA, behavioral-only flags, etc.).
 * Humans → null.
 */
export function resolveBotCategory(
  isLikelyBot: boolean,
  userAgent: string | null | undefined,
): BotCategory | null {
  if (!isLikelyBot) return null
  return isKnownCrawlerUserAgent(userAgent) ? "KNOWN_CRAWLER" : "UNIDENTIFIED"
}
