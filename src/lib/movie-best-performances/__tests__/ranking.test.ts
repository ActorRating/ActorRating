/**
 * @jest-environment node
 */

import {
  BAYESIAN_M,
  BAYESIAN_PRIOR_FALLBACK,
  bayesianPriorC,
  bayesianSortScore,
  rankPerformances,
  type RankablePerformance,
} from "@/lib/movie-best-performances/ranking"

function role(
  overrides: Partial<RankablePerformance> & Pick<RankablePerformance, "actorName" | "avg10" | "count">,
): RankablePerformance {
  return {
    performanceId: overrides.performanceId ?? `p-${overrides.actorName}`,
    actorId: overrides.actorId ?? `a-${overrides.actorName}`,
    actorName: overrides.actorName,
    actorSlug: overrides.actorSlug ?? overrides.actorName.toLowerCase().replace(/\s+/g, "-"),
    actorImageUrl: overrides.actorImageUrl ?? null,
    character: overrides.character ?? null,
    tier: overrides.tier ?? "LEAD",
    order: overrides.order ?? 0,
    avg10: overrides.avg10,
    count: overrides.count,
  }
}

describe("bayesianPriorC", () => {
  it("falls back to 7.0 when no rated roles", () => {
    expect(bayesianPriorC([role({ actorName: "A", avg10: null, count: 0 })])).toBe(
      BAYESIAN_PRIOR_FALLBACK,
    )
  })

  it("means avg10 of roles with n>=1", () => {
    expect(
      bayesianPriorC([
        role({ actorName: "A", avg10: 8.0, count: 2 }),
        role({ actorName: "B", avg10: 6.0, count: 1 }),
        role({ actorName: "C", avg10: null, count: 0 }),
      ]),
    ).toBe(7.0)
  })
})

describe("bayesianSortScore", () => {
  it("returns null for zero ratings", () => {
    expect(bayesianSortScore(null, 0, 7.0)).toBeNull()
    expect(bayesianSortScore(10, 0, 7.0)).toBeNull()
  })

  it("pulls a single 10 toward the prior (cannot dominate a high-n 9.2)", () => {
    const c = 7.0
    const single10 = bayesianSortScore(10, 1, c, BAYESIAN_M)!
    const many92 = bayesianSortScore(9.2, 20, c, BAYESIAN_M)!
    expect(single10).toBeLessThan(many92)
    // (1/6)*10 + (5/6)*7 = 1.666… + 5.833… = 7.5
    expect(single10).toBeCloseTo(7.5, 5)
  })
})

describe("rankPerformances", () => {
  it("places zero-rating roles after all rated roles", () => {
    const ranked = rankPerformances([
      role({ actorName: "Unrated Lead", avg10: null, count: 0, tier: "LEAD", order: 0 }),
      role({ actorName: "One Vote", avg10: 6.0, count: 1, tier: "SUPPORTING", order: 5 }),
    ])
    expect(ranked.map((r) => r.actorName)).toEqual(["One Vote", "Unrated Lead"])
    expect(ranked[0].avg10).toBe(6.0)
    expect(ranked[1].avg10).toBeNull()
  })

  it("does not display sortScore as the community score (avg10 stays plain)", () => {
    // Force prior C=7 so sortScore shrinks; UI still shows plain avg10=10.
    const ranked = rankPerformances(
      [role({ actorName: "Single Ten", avg10: 10, count: 1, tier: "LEAD" })],
      { c: 7.0 },
    )
    expect(ranked[0].avg10).toBe(10)
    expect(ranked[0].sortScore).not.toBe(10)
    expect(ranked[0].sortScore).toBeCloseTo(7.5, 5)
  })

  it("tiebreaks by higher n, then LEAD before SUPPORTING, then billing order", () => {
    const c = 8.0
    const ranked = rankPerformances(
      [
        role({
          actorName: "Support Early",
          avg10: 8.0,
          count: 2,
          tier: "SUPPORTING",
          order: 1,
        }),
        role({
          actorName: "Lead Later",
          avg10: 8.0,
          count: 2,
          tier: "LEAD",
          order: 9,
        }),
        role({
          actorName: "Lead More Votes",
          avg10: 8.0,
          count: 5,
          tier: "LEAD",
          order: 2,
        }),
      ],
      { c },
    )
    // Same avg → same sortScore when n differs: higher n wins first
    expect(ranked[0].actorName).toBe("Lead More Votes")
    // Equal n and sortScore: LEAD before SUPPORTING
    expect(ranked[1].actorName).toBe("Lead Later")
    expect(ranked[2].actorName).toBe("Support Early")
  })

  it("never fabricates avg10 for unrated roles", () => {
    const ranked = rankPerformances([
      role({ actorName: "Nobody", avg10: null, count: 0, tier: "LEAD" }),
    ])
    expect(ranked[0].avg10).toBeNull()
    expect(ranked[0].count).toBe(0)
    expect(ranked[0].sortScore).toBeNull()
  })
})
