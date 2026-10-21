/**
 * @jest-environment node
 */

import {
  computeCommunityStatsFromRatings,
  getCommunityStatsForPair,
} from "@/lib/ratings/community-stats"

function dims(all: number) {
  return {
    emotionalRangeDepth: all,
    characterBelievability: all,
    technicalSkill: all,
    screenPresence: all,
    chemistryInteraction: all,
  }
}

describe("computeCommunityStatsFromRatings (rate-page bubble parity)", () => {
  it("returns { avg10: null, count: 0 } with no dimensions when empty", () => {
    const result = computeCommunityStatsFromRatings([])
    expect(result).toEqual({ avg10: null, count: 0 })
    expect("dimensions" in result).toBe(false)
  })

  it("never fabricates a score from empty input", () => {
    const result = computeCommunityStatsFromRatings([])
    expect(result.avg10).toBeNull()
    expect(result.count).toBe(0)
  })

  it("averages five dimensions then scales to 0–10", () => {
    // One rating: all 80 → avg100=80 → avg10=8.0
    const result = computeCommunityStatsFromRatings([dims(80)])
    expect(result.count).toBe(1)
    expect(result.avg10).toBe(8.0)
    if ("dimensions" in result) {
      expect(result.dimensions.emotionalRangeDepth).toBe(8.0)
      expect(result.dimensions.technicalSkill).toBe(8.0)
    }
  })

  it("means across multiple ratings", () => {
    // 100 and 60 → per-rating means 100, 60 → avg100=80 → 8.0
    const result = computeCommunityStatsFromRatings([dims(100), dims(60)])
    expect(result.count).toBe(2)
    expect(result.avg10).toBe(8.0)
  })
})

describe("getCommunityStatsForPair", () => {
  it("matches computeCommunityStatsFromRatings for the same rows (API parity)", async () => {
    const rows = [dims(90), dims(70)]
    const expected = computeCommunityStatsFromRatings(rows)

    const prisma = {
      rating: {
        findMany: jest.fn().mockResolvedValue(rows),
      },
    }

    const result = await getCommunityStatsForPair(
      prisma as never,
      "actor-1",
      "movie-1",
    )

    expect(prisma.rating.findMany).toHaveBeenCalledWith({
      where: { actorId: "actor-1", movieId: "movie-1", userId: { not: null } },
      select: {
        emotionalRangeDepth: true,
        characterBelievability: true,
        technicalSkill: true,
        screenPresence: true,
        chemistryInteraction: true,
      },
    })
    expect(result).toEqual(expected)
  })

  it("returns empty shape when prisma finds no signed-in ratings", async () => {
    const prisma = {
      rating: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    const result = await getCommunityStatsForPair(
      prisma as never,
      "a",
      "m",
    )
    expect(result).toEqual({ avg10: null, count: 0 })
  })
})
