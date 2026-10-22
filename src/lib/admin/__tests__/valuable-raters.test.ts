/**
 * @jest-environment node
 */

import {
  aggregateValuableRaterClassifications,
  classifyRaterFromRatings,
  raterKey,
} from "@/lib/admin/valuable-raters"

const windowStart = new Date("2026-10-01T00:00:00.000Z")
const windowEnd = new Date("2026-10-08T00:00:00.000Z")

describe("raterKey", () => {
  it("prefers userId over anonId", () => {
    expect(raterKey({ userId: "u1", anonId: "a1" })).toBe("u:u1")
    expect(raterKey({ userId: null, anonId: "a1" })).toBe("a:a1")
    expect(raterKey({ userId: null, anonId: null })).toBeNull()
  })
})

describe("classifyRaterFromRatings", () => {
  it("returns zeros for empty ratings", () => {
    expect(
      classifyRaterFromRatings([], { windowStart, windowEnd }),
    ).toMatchObject({
      isNewInWindow: false,
      isEngaged: false,
      isReturning: false,
    })
  })

  it("counts a rater with a rating in the window as new", () => {
    const r = classifyRaterFromRatings(
      [{ at: new Date("2026-10-03T12:00:00.000Z"), utmSource: "x" }],
      { windowStart, windowEnd },
    )
    expect(r.isNewInWindow).toBe(true)
    expect(r.isEngaged).toBe(false)
    expect(r.firstTouchSource).toBe("x")
  })

  it("marks engaged when first rating is in-window and ≥3 within 7 days", () => {
    const first = new Date("2026-10-02T00:00:00.000Z")
    const r = classifyRaterFromRatings(
      [
        { at: first, utmSource: "reddit" },
        { at: new Date(first.getTime() + 86400000) },
        { at: new Date(first.getTime() + 2 * 86400000) },
      ],
      { windowStart, windowEnd },
    )
    expect(r.isEngaged).toBe(true)
    expect(r.isReturning).toBe(true) // 3 distinct days within 21d
    expect(r.firstTouchSource).toBe("reddit")
  })

  it("does not mark engaged when only 2 ratings in 7 days", () => {
    const first = new Date("2026-10-02T00:00:00.000Z")
    const r = classifyRaterFromRatings(
      [{ at: first }, { at: new Date(first.getTime() + 86400000) }],
      { windowStart, windowEnd },
    )
    expect(r.isEngaged).toBe(false)
    expect(r.isReturning).toBe(true) // 2 distinct days
  })

  it("does not mark engaged/returning when first rating is outside the window", () => {
    const first = new Date("2026-09-01T00:00:00.000Z")
    const r = classifyRaterFromRatings(
      [
        { at: first },
        { at: new Date(first.getTime() + 86400000) },
        { at: new Date(first.getTime() + 2 * 86400000) },
        { at: new Date("2026-10-05T00:00:00.000Z") },
      ],
      { windowStart, windowEnd },
    )
    expect(r.isNewInWindow).toBe(true)
    expect(r.isEngaged).toBe(false)
    expect(r.isReturning).toBe(false)
  })
})

describe("aggregateValuableRaterClassifications", () => {
  it("aggregates channel rows and totals", () => {
    const agg = aggregateValuableRaterClassifications([
      {
        isNewInWindow: true,
        isEngaged: true,
        isReturning: false,
        firstTouchSource: "x",
        firstTouchCampaign: "odyssey_hub",
      },
      {
        isNewInWindow: true,
        isEngaged: false,
        isReturning: true,
        firstTouchSource: "x",
        firstTouchCampaign: "(none)",
      },
      {
        isNewInWindow: false,
        isEngaged: false,
        isReturning: false,
        firstTouchSource: "tiktok",
        firstTouchCampaign: "bio",
      },
    ])
    expect(agg.newRaters).toBe(2)
    expect(agg.engagedRaters).toBe(1)
    expect(agg.returningRaters).toBe(1)
    expect(agg.bySource.find((r) => r.key === "x")).toMatchObject({
      newRaters: 2,
      engagedRaters: 1,
      returningRaters: 1,
    })
  })
})
