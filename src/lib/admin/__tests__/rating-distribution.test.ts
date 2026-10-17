import {
  classifyRatingExclusion,
  percentOfTotal,
  reportFromAggregates,
} from "@/lib/admin/rating-distribution"

describe("rating distribution aggregates", () => {
  it("does not divide when there are no Rating rows", () => {
    expect(percentOfTotal(0, 0)).toBeNull()
    expect(percentOfTotal(3, 0)).toBeNull()
  })

  it("reports one-decimal shares of all Rating rows", () => {
    expect(percentOfTotal(396, 837)).toBe(47.3)
    expect(percentOfTotal(0, 837)).toBe(0)
  })

  it("labels only exclusions that the code already names", () => {
    expect(
      classifyRatingExclusion({ email: "seed.leo@actorrating.local", slug: null }),
    ).toEqual(["seed-domain"])
    expect(
      classifyRatingExclusion({ email: "demo@local.test", slug: "demo-123" }),
    ).toEqual(["script-demo", "demo-slug"])
    expect(
      classifyRatingExclusion({ email: "seed_user@example.com", slug: null }),
    ).toEqual(["script-demo"])
    expect(
      classifyRatingExclusion({ email: "someone@example.com", slug: null }),
    ).toEqual([])
    expect(
      classifyRatingExclusion({ email: null, slug: null }),
    ).toEqual([])
  })

  it("does not call an admin-hidden personal account a seed or demo account", () => {
    expect(
      classifyRatingExclusion({ email: "contact.actorrating@gmail.com", slug: null }),
    ).toEqual(["admin-hidden"])
  })

  it("builds percentages from aggregate counts without identifiers", () => {
    const report = reportFromAggregates({
      totalRatings: 10,
      signedInRatings: 8,
      guestRatings: 2,
      distinctActors: 4,
      distinctPairs: 5,
      pairsAtLeast5: 1,
      pairsAtLeast10: 0,
      pairsAtLeast25: 0,
      signedInAccounts: 3,
      top1Ratings: 5,
      top3Ratings: 8,
      top5Ratings: 8,
      seedDomainRatings: 2,
      scriptDemoRatings: 0,
      adminHiddenOtherRatings: 1,
      demoSlugRatings: 0,
      excludedRatings: 3,
      remainingRatings: 7,
      remainingSignedIn: 5,
      remainingGuest: 2,
      remainingDistinctActors: 3,
      remainingDistinctPairs: 4,
      remainingPairsAtLeast5: 1,
      remainingPairsAtLeast10: 0,
      remainingPairsAtLeast25: 0,
      remainingSignedInAccounts: 2,
      remainingTop1Ratings: 4,
      remainingTop3Ratings: 5,
      remainingTop5Ratings: 5,
    })

    expect(report.top1PercentOfAll).toBe(50)
    expect(report.top5PercentOfAll).toBe(80)
    expect(report.remainingTop1PercentOfRemaining).toBe(57.1)
    expect(report).not.toHaveProperty("email")
    expect(report).not.toHaveProperty("userId")
  })
})
