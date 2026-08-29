import { describe, expect, it } from "vitest"
import { isRatePageIndexable, MIN_COMMUNITY_RATINGS_FOR_INDEX } from "../rate-page-seo"

const base = {
  movieSlug: "the-dark-knight-2008",
  movieTitle: "The Dark Knight",
  indexingCohort: 1,
  seededAggregateScore: 8.5,
  tier: "LEAD",
}

describe("isRatePageIndexable", () => {
  it("requires at least two community ratings", () => {
    expect(MIN_COMMUNITY_RATINGS_FOR_INDEX).toBe(2)
    expect(isRatePageIndexable({ ...base, communityRatingCount: 0 })).toBe(false)
    expect(isRatePageIndexable({ ...base, communityRatingCount: 1 })).toBe(false)
    expect(isRatePageIndexable({ ...base, communityRatingCount: 2 })).toBe(true)
  })

  it("does not index seeded-only pages without enough community ratings", () => {
    expect(
      isRatePageIndexable({
        ...base,
        communityRatingCount: 0,
        seededAggregateScore: 9.1,
        indexingCohort: 1,
      }),
    ).toBe(false)
  })

  it("rejects MINOR tier and malformed slugs", () => {
    expect(isRatePageIndexable({ ...base, communityRatingCount: 3, tier: "MINOR" })).toBe(false)
    expect(
      isRatePageIndexable({
        ...base,
        communityRatingCount: 3,
        movieSlug: "-2019",
        movieTitle: "Untitled",
      }),
    ).toBe(false)
  })
})
