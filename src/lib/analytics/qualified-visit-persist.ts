/**
 * Pure gates for first-party `qualified_visit` persistence (testable without DB).
 */

export const QUALIFIED_VISIT_DEDUPE_WINDOW_MS = 10 * 60 * 1000
export const QUALIFIED_VISIT_PAGEVIEW_LOOKBACK_MS = 15 * 60 * 1000
/** Soft cap across all product event names per IP hash. */
export const PRODUCT_EVENT_IP_HOUR_MAX = 60
export const PRODUCT_EVENT_IP_HOUR_WINDOW_MS = 60 * 60 * 1000

export type MatchingPageView = {
  isLikelyBot: boolean
}

export type QualifiedVisitGateInput = {
  /** True when a qualified_visit already exists for (ipHash, path) in the dedupe window. */
  hasRecentDuplicate: boolean
  matchingPageView: MatchingPageView | null
  /** From evaluatePageViewBot (UA / accept-language / burst / junk path). */
  evaluateBotIsLikelyBot: boolean
}

export type QualifiedVisitGateResult =
  | { accept: false; reason: "duplicate" | "no_pageview" }
  | { accept: true; isLikelyBot: boolean }

/**
 * Decide whether to store a qualified_visit and which bot flag to use.
 * Duplicate / missing pageview → drop. Matching bot pageview → store as bot.
 */
export function gateQualifiedVisitPersist(
  input: QualifiedVisitGateInput,
): QualifiedVisitGateResult {
  if (input.hasRecentDuplicate) {
    return { accept: false, reason: "duplicate" }
  }
  if (!input.matchingPageView) {
    return { accept: false, reason: "no_pageview" }
  }
  return {
    accept: true,
    isLikelyBot:
      input.evaluateBotIsLikelyBot || input.matchingPageView.isLikelyBot,
  }
}
