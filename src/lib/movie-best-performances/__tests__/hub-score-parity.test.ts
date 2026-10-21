/**
 * @jest-environment node
 *
 * Hub scores must match getCommunityStatsForPair / community-stats API for the same pair.
 */

import { computeCommunityStatsFromRatings } from "@/lib/ratings/community-stats"
import {
  loadMovieBestPerformancesHub,
  omitDuplicateCastCharacters,
} from "@/lib/movie-best-performances/load-hub"
import type { RankablePerformance } from "@/lib/movie-best-performances/ranking"

describe("hub score parity with community-stats rule", () => {
  it("uses signed-in-only averages identical to computeCommunityStatsFromRatings", async () => {
    const movie = {
      id: "movie-1",
      title: "The Odyssey",
      year: 2026,
      slug: "the-odyssey-2026",
      posterUrl: null,
      isFeaturette: false,
    }

    const leadRatings = [
      {
        emotionalRangeDepth: 90,
        characterBelievability: 90,
        technicalSkill: 90,
        screenPresence: 90,
        chemistryInteraction: 90,
      },
    ]
    const expectedLead = computeCommunityStatsFromRatings(leadRatings)

    const prisma = {
      movie: {
        findFirst: jest.fn().mockResolvedValue(movie),
      },
      performance: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "perf-lead",
            actorId: "actor-lead",
            movieId: "movie-1",
            character: "Odysseus",
            tier: "LEAD",
            order: 0,
            userId: "uuid-from-auth-users",
            createdAt: new Date("2024-01-01"),
            seededAggregateScore: null,
            actor: {
              id: "actor-lead",
              name: "Matt Damon",
              slug: "matt-damon",
              imageUrl: null,
            },
          },
          {
            id: "perf-minor",
            actorId: "actor-minor",
            movieId: "movie-1",
            character: "Bard",
            tier: "MINOR",
            order: 20,
            userId: "uuid-from-auth-users",
            createdAt: new Date("2024-01-01"),
            seededAggregateScore: null,
            actor: {
              id: "actor-minor",
              name: "Extra",
              slug: "extra",
              imageUrl: null,
            },
          },
        ]),
      },
      rating: {
        findMany: jest.fn().mockResolvedValue(
          leadRatings.map((r) => ({ ...r, actorId: "actor-lead" })),
        ),
      },
    }

    const hub = await loadMovieBestPerformancesHub(prisma as never, "the-odyssey-2026")
    expect(hub).not.toBeNull()
    expect(hub!.movie.slug).toBe("the-odyssey-2026")
    expect(hub!.totalSignedInRatings).toBe(1)
    expect(hub!.rankedLeadsAndSupporting).toHaveLength(1)
    expect(hub!.rankedLeadsAndSupporting[0].avg10).toBe(expectedLead.avg10)
    expect(hub!.rankedLeadsAndSupporting[0].count).toBe(expectedLead.count)
    expect(hub!.fullCastMinors).toHaveLength(1)
    expect(hub!.fullCastMinors[0].avg10).toBeNull()
    expect(hub!.fullCastMinors[0].count).toBe(0)
  })

  it("omits character when Performance rows disagree for the same pair", async () => {
    const prisma = {
      movie: {
        findFirst: jest.fn().mockResolvedValue({
          id: "m1",
          title: "The Odyssey",
          year: 2026,
          slug: "the-odyssey-2026",
          posterUrl: null,
          isFeaturette: false,
        }),
      },
      performance: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "p1",
            actorId: "a1",
            movieId: "m1",
            character: "Circe",
            tier: "SUPPORTING",
            order: 1,
            userId: "uuid-from-auth-users",
            createdAt: new Date("2024-01-01"),
            seededAggregateScore: null,
            actor: { id: "a1", name: "Actor", slug: "actor", imageUrl: null },
          },
          {
            id: "p2",
            actorId: "a1",
            movieId: "m1",
            character: "Penelope",
            tier: "SUPPORTING",
            order: 2,
            userId: "other-user",
            createdAt: new Date("2024-01-02"),
            seededAggregateScore: null,
            actor: { id: "a1", name: "Actor", slug: "actor", imageUrl: null },
          },
        ]),
      },
      rating: { findMany: jest.fn().mockResolvedValue([]) },
    }

    const hub = await loadMovieBestPerformancesHub(prisma as never, "the-odyssey-2026")
    expect(hub!.rankedLeadsAndSupporting[0].character).toBeNull()
    expect(hub!.omittedCharacters).toEqual([
      {
        actorId: "a1",
        actorName: "Actor",
        reason: "conflicting",
        values: expect.arrayContaining(["Circe", "Penelope"]),
      },
    ])
  })

  it("omits a character billed to two different actors on the same film", () => {
    const base = {
      performanceId: "p",
      actorSlug: "x",
      actorImageUrl: null,
      tier: "SUPPORTING" as const,
      order: 1,
      avg10: null,
      count: 0,
    }
    const roles: RankablePerformance[] = [
      {
        ...base,
        performanceId: "p1",
        actorId: "a1",
        actorName: "Charlize Theron",
        character: "Circe",
      },
      {
        ...base,
        performanceId: "p2",
        actorId: "a2",
        actorName: "Samantha Morton",
        character: "Circe",
      },
      {
        ...base,
        performanceId: "p3",
        actorId: "a3",
        actorName: "Matt Damon",
        character: "Odysseus",
      },
    ]
    const { roles: cleaned, omitted } = omitDuplicateCastCharacters(roles)
    expect(cleaned.find((r) => r.actorId === "a1")?.character).toBeNull()
    expect(cleaned.find((r) => r.actorId === "a2")?.character).toBeNull()
    expect(cleaned.find((r) => r.actorId === "a3")?.character).toBe("Odysseus")
    expect(omitted).toHaveLength(2)
    expect(omitted.every((o) => o.reason === "duplicate_across_cast")).toBe(true)
  })
})
