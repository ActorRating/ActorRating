import { computeTrustRates, safeRatio, type TrustBucket } from "@/lib/admin/getTrafficTrustMetrics"
import { visitorQualifiesForReclassify } from "../reclassify"
import {
  createDwellState,
  dwellMarkInteraction,
  dwellOnVisibility,
  dwellTotalMs,
} from "../pageview-client"
import { formatBotReason } from "../pageview"

function bucket(partial: Partial<TrustBucket>): TrustBucket {
  return {
    pageviews: 0,
    visitors: 0,
    sessions: 0,
    engagedSessions: 0,
    bouncedSessions: 0,
    avgSessionDurationMs: null,
    avgPagesPerSession: null,
    ...partial,
  }
}

describe("computeTrustRates", () => {
  it("computes human and non-bot rates", () => {
    const r = computeTrustRates({
      human: bucket({ pageviews: 300, sessions: 100, engagedSessions: 70, bouncedSessions: 30 }),
      unknown: bucket({ pageviews: 700, sessions: 400, bouncedSessions: 390 }),
    })
    expect(r.humanEngagementRate).toBeCloseTo(0.7)
    expect(r.humanBounceRate).toBeCloseTo(0.3)
    expect(r.nonBotBounceRate).toBeCloseTo(420 / 500)
    expect(r.unknownShareOfNonBot).toBeCloseTo(0.7)
  })

  it("returns null rates when there are no sessions", () => {
    const r = computeTrustRates({ human: bucket({}), unknown: bucket({}) })
    expect(r.humanEngagementRate).toBeNull()
    expect(r.humanBounceRate).toBeNull()
    expect(r.nonBotBounceRate).toBeNull()
    expect(r.unknownShareOfNonBot).toBeNull()
    expect(safeRatio(1, 0)).toBeNull()
  })
})

describe("visitorQualifiesForReclassify", () => {
  const silent = {
    anyEngaged: false,
    anyDwellInteraction: false,
    anySignedIn: false,
    anyProofEvent: false,
  }
  it("requires the pageview floor", () => {
    expect(visitorQualifiesForReclassify({ pageviews: 4, ...silent })).toBe(false)
    expect(visitorQualifiesForReclassify({ pageviews: 5, ...silent })).toBe(true)
  })
  it("any positive signal exempts the visitor", () => {
    expect(visitorQualifiesForReclassify({ pageviews: 50, ...silent, anyEngaged: true })).toBe(false)
    expect(
      visitorQualifiesForReclassify({ pageviews: 50, ...silent, anyDwellInteraction: true }),
    ).toBe(false)
    expect(visitorQualifiesForReclassify({ pageviews: 50, ...silent, anySignedIn: true })).toBe(false)
    expect(visitorQualifiesForReclassify({ pageviews: 50, ...silent, anyProofEvent: true })).toBe(false)
  })
})

describe("dwell accounting", () => {
  it("accumulates only visible time and keeps the first interaction", () => {
    let s = createDwellState(true, 0)
    s = dwellOnVisibility(s, false, 4000) // hidden after 4s
    s = dwellOnVisibility(s, true, 10000) // back after 6s hidden
    expect(dwellTotalMs(s, 13000)).toBe(7000)
    s = dwellMarkInteraction(s, "scroll")
    s = dwellMarkInteraction(s, "keydown")
    expect(s.interaction).toBe("scroll")
  })

  it("starts hidden with zero dwell", () => {
    const s = createDwellState(false, 0)
    expect(dwellTotalMs(s, 5000)).toBe(0)
  })
})

describe("formatBotReason", () => {
  it("dedupes and clips", () => {
    expect(formatBotReason([])).toBeNull()
    expect(formatBotReason(["ip_burst", "ip_burst", "crawl_path"])).toBe("ip_burst,crawl_path")
    expect(formatBotReason(Array.from({ length: 40 }, (_, i) => `reason_${i}`))!.length).toBe(120)
  })
})
