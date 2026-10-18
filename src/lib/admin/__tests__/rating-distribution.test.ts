import {
  aggregateRatingDistribution,
  classifyRatingExclusion,
  percentOfTotal,
  reportFromAggregates,
  type RatingDistributionInput,
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

function row(
  partial: Partial<RatingDistributionInput> & Pick<RatingDistributionInput, "actorId" | "movieId">,
): RatingDistributionInput {
  return {
    userId: "user-kept",
    email: "viewer@example.com",
    slug: null,
    ...partial,
  }
}

describe("rating distribution exclusions", () => {
  it("keeps 832 rows when 837 ratings include five excluded rows", () => {
    const kept: RatingDistributionInput[] = []
    for (let i = 0; i < 800; i += 1) {
      kept.push(
        row({
          userId: `viewer-${i % 8}`,
          email: `viewer${i % 8}@example.com`,
          slug: null,
          actorId: i < 5 ? "shared-actor" : `actor-${i % 40}`,
          movieId: i < 5 ? "shared-movie" : `movie-${i % 30}`,
        }),
      )
    }
    for (let i = 0; i < 32; i += 1) {
      kept.push(
        row({
          userId: null,
          email: null,
          slug: null,
          actorId: "guest-actor",
          movieId: `guest-movie-${i % 4}`,
        }),
      )
    }
    const excluded: RatingDistributionInput[] = [
      row({
        userId: "seed-leo",
        email: "seed.leo@actorrating.local",
        actorId: "shared-actor",
        movieId: "shared-movie",
      }),
      row({
        userId: "demo-local",
        email: "demo@local.test",
        slug: "demo-123",
        actorId: "shared-actor",
        movieId: "other-movie",
      }),
      row({
        userId: "hidden-personal",
        email: "contact.actorrating@gmail.com",
        actorId: "hidden-actor",
        movieId: "hidden-movie",
      }),
      row({
        userId: "seed-script",
        email: "seed_user@example.com",
        actorId: "script-actor",
        movieId: "script-movie",
      }),
      row({
        userId: null,
        email: null,
        slug: "demo-123",
        actorId: "guest-actor",
        movieId: "guest-movie-0",
      }),
    ]

    const report = aggregateRatingDistribution([...kept, ...excluded])

    expect(report.totalRatings).toBe(837)
    expect(report.signedInRatings).toBe(804)
    expect(report.guestRatings).toBe(33)
    expect(report.excludedRatings).toBe(5)
    expect(report.remainingRatings).toBe(832)
    expect(report.remainingRatings).toBe(report.totalRatings - report.excludedRatings)
    expect(report.remainingSignedIn).toBe(800)
    expect(report.remainingGuest).toBe(32)
    expect(report.remainingSignedIn + report.remainingGuest).toBe(report.remainingRatings)
    expect(report.seedDomainRatings).toBe(1)
    expect(report.scriptDemoRatings).toBe(2)
    expect(report.adminHiddenOtherRatings).toBe(1)
    expect(report.demoSlugRatings).toBe(2)
    expect(report.distinctActors).toBe(report.remainingDistinctActors + 2)
    expect(report.remainingDistinctActors).toBeGreaterThan(0)
    expect(report.pairsAtLeast5).toBeGreaterThanOrEqual(1)
    expect(report.remainingPairsAtLeast5).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(report)).not.toMatch(/example\.com|actorrating\.local|demo-123|viewer-|seed-leo/)
  })

  it("counts a row that matches two exclusion rules once", () => {
    const report = aggregateRatingDistribution([
      row({
        userId: "demo-local",
        email: "demo@local.test",
        slug: "demo-123",
        actorId: "actor-a",
        movieId: "movie-a",
      }),
      row({ actorId: "actor-b", movieId: "movie-b" }),
    ])

    expect(report.totalRatings).toBe(2)
    expect(report.scriptDemoRatings).toBe(1)
    expect(report.demoSlugRatings).toBe(1)
    expect(report.excludedRatings).toBe(1)
    expect(report.remainingRatings).toBe(1)
    expect(report.remainingSignedIn).toBe(1)
    expect(report.remainingGuest).toBe(0)
  })

  it("splits remaining guest and signed-in rows so they add up", () => {
    const report = aggregateRatingDistribution([
      row({ userId: "signed-a", email: "a@example.com", actorId: "actor-1", movieId: "movie-1" }),
      row({ userId: "signed-a", email: "a@example.com", actorId: "actor-1", movieId: "movie-2" }),
      row({ userId: null, email: null, actorId: "actor-1", movieId: "movie-1" }),
      row({ userId: null, email: null, actorId: "actor-2", movieId: "movie-3" }),
      row({
        userId: "seed-maya",
        email: "seed.maya@actorrating.local",
        actorId: "actor-1",
        movieId: "movie-1",
      }),
    ])

    expect(report.signedInRatings).toBe(3)
    expect(report.guestRatings).toBe(2)
    expect(report.remainingSignedIn).toBe(2)
    expect(report.remainingGuest).toBe(2)
    expect(report.remainingSignedIn + report.remainingGuest).toBe(report.remainingRatings)
    expect(report.remainingRatings).toBe(4)
    expect(report.distinctActors).toBe(2)
    expect(report.remainingDistinctActors).toBe(2)
    expect(report.distinctPairs).toBe(3)
    expect(report.remainingDistinctPairs).toBe(3)
  })

  it("returns zeroes for an empty dataset", () => {
    const report = aggregateRatingDistribution([])

    expect(report.totalRatings).toBe(0)
    expect(report.excludedRatings).toBe(0)
    expect(report.remainingRatings).toBe(0)
    expect(report.remainingSignedIn).toBe(0)
    expect(report.remainingGuest).toBe(0)
    expect(report.distinctActors).toBe(0)
    expect(report.remainingDistinctActors).toBe(0)
    expect(report.distinctPairs).toBe(0)
    expect(report.remainingDistinctPairs).toBe(0)
    expect(report.pairsAtLeast5).toBe(0)
    expect(report.remainingPairsAtLeast5).toBe(0)
    expect(report.top1PercentOfAll).toBeNull()
    expect(report.remainingTop1PercentOfRemaining).toBeNull()
  })

  it("keeps every row when none match an exclusion rule", () => {
    const rows = [
      row({ userId: "signed-a", email: "a@example.com", slug: null, actorId: "actor-1", movieId: "movie-1" }),
      row({ userId: "signed-b", email: "b@example.com", slug: "share-abc", actorId: "actor-1", movieId: "movie-1" }),
      row({ userId: null, email: null, slug: null, actorId: "actor-2", movieId: "movie-2" }),
    ]
    const report = aggregateRatingDistribution(rows)

    expect(report.totalRatings).toBe(3)
    expect(report.excludedRatings).toBe(0)
    expect(report.remainingRatings).toBe(3)
    expect(report.remainingSignedIn).toBe(2)
    expect(report.remainingGuest).toBe(1)
    expect(report.remainingDistinctActors).toBe(report.distinctActors)
    expect(report.remainingDistinctPairs).toBe(report.distinctPairs)
    expect(report.seedDomainRatings).toBe(0)
    expect(report.scriptDemoRatings).toBe(0)
    expect(report.adminHiddenOtherRatings).toBe(0)
    expect(report.demoSlugRatings).toBe(0)
  })

  it("recalculates pair thresholds from the rows that remain", () => {
    const kept = Array.from({ length: 4 }, (_, index) =>
      row({
        userId: `viewer-${index}`,
        email: `viewer${index}@example.com`,
        actorId: "actor-1",
        movieId: "movie-1",
      }),
    )
    const report = aggregateRatingDistribution([
      ...kept,
      row({
        userId: "seed-omar",
        email: "seed.omar@actorrating.local",
        actorId: "actor-1",
        movieId: "movie-1",
      }),
    ])

    expect(report.pairsAtLeast5).toBe(1)
    expect(report.remainingPairsAtLeast5).toBe(0)
    expect(report.remainingDistinctPairs).toBe(1)
    expect(report.remainingDistinctActors).toBe(1)
    expect(report.remainingRatings).toBe(4)
  })
})
