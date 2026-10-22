/**
 * @jest-environment node
 */

import {
  gateQualifiedVisitPersist,
  QUALIFIED_VISIT_DEDUPE_WINDOW_MS,
  QUALIFIED_VISIT_PAGEVIEW_LOOKBACK_MS,
  PRODUCT_EVENT_IP_HOUR_MAX,
} from "@/lib/analytics/qualified-visit-persist"

describe("gateQualifiedVisitPersist", () => {
  it("drops duplicate within the dedupe window", () => {
    expect(
      gateQualifiedVisitPersist({
        hasRecentDuplicate: true,
        matchingPageView: { isLikelyBot: false },
        evaluateBotIsLikelyBot: false,
      }),
    ).toEqual({ accept: false, reason: "duplicate" })
  })

  it("drops when no matching pageview exists", () => {
    expect(
      gateQualifiedVisitPersist({
        hasRecentDuplicate: false,
        matchingPageView: null,
        evaluateBotIsLikelyBot: false,
      }),
    ).toEqual({ accept: false, reason: "no_pageview" })
  })

  it("marks the event as bot when the matching pageview is bot-flagged", () => {
    expect(
      gateQualifiedVisitPersist({
        hasRecentDuplicate: false,
        matchingPageView: { isLikelyBot: true },
        evaluateBotIsLikelyBot: false,
      }),
    ).toEqual({ accept: true, isLikelyBot: true })
  })

  it("accepts a human pageview match as non-bot when evaluateBot is clean", () => {
    expect(
      gateQualifiedVisitPersist({
        hasRecentDuplicate: false,
        matchingPageView: { isLikelyBot: false },
        evaluateBotIsLikelyBot: false,
      }),
    ).toEqual({ accept: true, isLikelyBot: false })
  })

  it("ORs evaluatePageViewBot with pageview bot flag", () => {
    expect(
      gateQualifiedVisitPersist({
        hasRecentDuplicate: false,
        matchingPageView: { isLikelyBot: false },
        evaluateBotIsLikelyBot: true,
      }),
    ).toEqual({ accept: true, isLikelyBot: true })
  })

  it("documents window constants used by persistProductEvent", () => {
    expect(QUALIFIED_VISIT_DEDUPE_WINDOW_MS).toBe(10 * 60 * 1000)
    expect(QUALIFIED_VISIT_PAGEVIEW_LOOKBACK_MS).toBe(15 * 60 * 1000)
    expect(PRODUCT_EVENT_IP_HOUR_MAX).toBe(60)
  })
})
