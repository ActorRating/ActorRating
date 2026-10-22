/**
 * @jest-environment node
 */

import { buildHubAnswerFirst } from "@/lib/movie-best-performances/hub-answer-first"
import type { RankedPerformance } from "@/lib/movie-best-performances/ranking"

const top: RankedPerformance = {
  performanceId: "p1",
  actorId: "a1",
  actorName: "Anne Hathaway",
  actorSlug: "anne-hathaway",
  actorImageUrl: null,
  character: "Circe",
  tier: "LEAD",
  order: 1,
  avg10: 8.4,
  count: 12,
  sortScore: 8.1,
}

describe("buildHubAnswerFirst", () => {
  it("uses real top role and counts when ratings exist", () => {
    const r = buildHubAnswerFirst({
      movieTitle: "The Odyssey",
      year: 2026,
      totalSignedInRatings: 40,
      top,
      asOf: new Date("2026-10-22T12:00:00.000Z"),
    })
    expect(r.summary).toContain("Anne Hathaway as Circe")
    expect(r.summary).toContain("8.4/10")
    expect(r.summary).toContain("40 signed-in community ratings")
    expect(r.sourceLine).toContain("/methodology")
    expect(r.asOfLabel).toBe("2026-10-22")
  })

  it("falls back when n=0", () => {
    const r = buildHubAnswerFirst({
      movieTitle: "The Odyssey",
      year: 2026,
      totalSignedInRatings: 0,
      top: null,
      asOf: new Date("2026-10-22T12:00:00.000Z"),
    })
    expect(r.summary).toContain("No signed-in community ratings yet")
    expect(r.summary).toContain("Be the first to rate")
  })
})
