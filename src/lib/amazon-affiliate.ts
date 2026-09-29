import { AMAZON_AFFILIATE_LINKS } from "@/data/amazon-affiliate-links"

const LINKS_BY_SLUG = new Map(
  Object.entries(AMAZON_AFFILIATE_LINKS).map(([slug, url]) => [slug.trim().toLowerCase(), url]),
)

/**
 * SiteStripe short links and Amazon storefronts (including regional, e.g. amazon.com.tr).
 * Anything else is ignored so a bad paste cannot become an open redirect.
 */
function isAmazonStoreHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "")
  if (host === "amzn.to" || host === "a.co") return true
  return /(^|\.)amazon\.(com\.[a-z]{2}|co\.[a-z]{2}|com|[a-z]{2})$/.test(host)
}

/** Returns the URL only when it is an https Amazon / SiteStripe link. */
export function sanitizeAmazonAffiliateUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:") return null
  if (parsed.username || parsed.password) return null
  if (!isAmazonStoreHost(parsed.hostname)) return null
  return parsed.toString()
}

/** Affiliate URL for a movie slug, or null when none is configured. */
export function getAmazonAffiliateUrl(slug: string | null | undefined): string | null {
  if (!slug) return null
  const raw = LINKS_BY_SLUG.get(slug.trim().toLowerCase())
  return sanitizeAmazonAffiliateUrl(raw)
}
