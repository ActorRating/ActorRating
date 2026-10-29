/**
 * Behavioural "Bot-suspect" rules that move rows out of Unknown without
 * dropping them. Rows stay stored; isLikelyBot + botReason carry the flag.
 * Human proof (qualified_visit / rating / etc.) still exempts and can unflag.
 */

import { checkSharedRateLimit } from "@/lib/analytics/rate-limit"
import { isInternalSiteReferrer } from "@/lib/analytics/internal-crawl"

/**
 * Cookie-less pageviews (no prior ar_vid) per IP per rolling hour.
 * Propose N=10: a real browser clearing cookies rarely mints 10 visitor ids/hour
 * from one IP; scrapers that discard Set-Cookie do. Softer than ip_burst (30/min).
 */
export const COOKIE_LESS_BURST_MAX_PER_HOUR = 10
export const COOKIE_LESS_BURST_WINDOW_MS = 60 * 60 * 1000

export const BOT_REASON_INTERNAL_REF_NEW_VISITOR = "internal_ref_new_visitor"
export const BOT_REASON_COOKIE_LESS_BURST = "cookie_less_burst"

const cookieLessIpWindow = new Map<string, { count: number; resetAt: number }>()

/**
 * First beacon with no prior ar_vid + internal actorrating.com referrer.
 * A real first visit cannot arrive from a page they have not yet visited
 * with cookies already established.
 */
export function isInternalReferrerNewVisitorSuspect(input: {
  isNewVisitor: boolean
  referrer: string | null | undefined
  humanExempt?: boolean
}): boolean {
  if (input.humanExempt) return false
  if (!input.isNewVisitor) return false
  return isInternalSiteReferrer(input.referrer)
}

/**
 * True when this IP exceeded the cookie-less pageview budget in the hour.
 * Only counts when the current request itself is cookie-less (isNewVisitor).
 * Shared across instances via Upstash when configured.
 */
export async function isCookieLessPageViewBurst(
  ipHash: string,
  isNewVisitor: boolean,
): Promise<boolean> {
  if (!isNewVisitor) return false
  const ok = await checkSharedRateLimit(
    "pv_nocookie",
    ipHash,
    {
      windowMs: COOKIE_LESS_BURST_WINDOW_MS,
      maxRequests: COOKIE_LESS_BURST_MAX_PER_HOUR,
    },
    cookieLessIpWindow,
  )
  return !ok
}

/** Pure helper for tests / dashboard: reversible behavioural bot-suspect reasons. */
export function isReversibleBotSuspectReason(botReason: string | null | undefined): boolean {
  if (!botReason) return false
  return /^(crawl_|reclassified_|internal_ref_new_visitor|cookie_less_burst)/.test(botReason)
}

/** Collect bot-suspect reasons for the current pageview (pure + precomputed burst). */
export function evaluateBotSuspectReasons(input: {
  isNewVisitor: boolean
  referrer: string | null | undefined
  humanExempt?: boolean
  cookieLessBurst?: boolean
}): string[] {
  const reasons: string[] = []
  if (isInternalReferrerNewVisitorSuspect(input)) {
    reasons.push(BOT_REASON_INTERNAL_REF_NEW_VISITOR)
  }
  if (!input.humanExempt && input.cookieLessBurst) {
    reasons.push(BOT_REASON_COOKIE_LESS_BURST)
  }
  return reasons
}
