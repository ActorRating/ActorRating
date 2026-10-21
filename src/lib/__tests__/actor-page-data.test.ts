/**
 * @jest-environment node
 */

import {
  ACTOR_CRAWL_SHELL_LIMIT,
  buildActorCrawlShellEntries,
  communityAverageScore100,
  formatCommunityScoreLabel,
  type ActorPagePerformance,
} from "@/lib/actor-page-data"

function perf(overrides: Partial<ActorPagePerformance> & { movieId: string; title: string; year?: number }): ActorPagePerformance {
  const { movieId, title, year = 2000, ...rest } = overrides
  return {
    id: `perf-${movieId}`,
    userId: "system",
    actorId: "actor-1",
    movieId,
    comment: null,
    character: rest.character ?? null,
    seededAggregateScore: rest.seededAggregateScore ?? null,
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    movie: {
      id: movieId,
      title,
      year,
      director: "Director",
      tmdbId: 1,
      slug: title.toLowerCase().replace(/\s+/g, "-") + `-${year}`,
      posterUrl: null,
      isFeaturette: false,
      releaseDate: null,
    },
    actor: { id: "actor-1", name: "Test Actor", slug: "test-actor" },
    roleName: rest.roleName ?? null,
    emotionalRangeDepth: rest.emotionalRangeDepth ?? 0,
    characterBelievability: rest.characterBelievability ?? 0,
    technicalSkill: rest.technicalSkill ?? 0,
    screenPresence: rest.screenPresence ?? 0,
    chemistryInteraction: rest.chemistryInteraction ?? 0,
    ratingCount: rest.ratingCount ?? 0,
    scoreVariance: 0,
    featuredReview: null,
    user: { name: "User", email: "user@example.com" },
  }
}

describe("communityAverageScore100 / formatCommunityScoreLabel", () => {
  it("returns null / Be the first to rate when ratingCount is 0", () => {
    const p = perf({
      movieId: "m1",
      title: "Unrated",
      ratingCount: 0,
      emotionalRangeDepth: 90,
      characterBelievability: 90,
      technicalSkill: 90,
      screenPresence: 90,
      chemistryInteraction: 90,
    })
    expect(communityAverageScore100(p)).toBeNull()
    expect(formatCommunityScoreLabel(p)).toBe("Be the first to rate")
  })

  it("never uses seededAggregateScore as a community score", () => {
    const p = perf({
      movieId: "m2",
      title: "Seeded Only",
      ratingCount: 0,
      seededAggregateScore: 8.7,
    })
    expect(formatCommunityScoreLabel(p)).toBe("Be the first to rate")
  })

  it("formats real community averages on a 0–10 scale", () => {
    const p = perf({
      movieId: "m3",
      title: "Rated",
      ratingCount: 3,
      emotionalRangeDepth: 80,
      characterBelievability: 80,
      technicalSkill: 80,
      screenPresence: 80,
      chemistryInteraction: 80,
    })
    expect(communityAverageScore100(p)).toBe(80)
    expect(formatCommunityScoreLabel(p)).toBe("8.0/10")
  })
})

describe("buildActorCrawlShellEntries", () => {
  const actor = { id: "actor-1", slug: "test-actor" }

  it("caps the list and prefers higher community scores", () => {
    const performances = Array.from({ length: 60 }, (_, i) =>
      perf({
        movieId: `m${i}`,
        title: `Film ${i}`,
        year: 1980 + (i % 40),
        ratingCount: i === 5 ? 10 : i === 7 ? 2 : 0,
        emotionalRangeDepth: i === 5 ? 90 : i === 7 ? 70 : 0,
        characterBelievability: i === 5 ? 90 : i === 7 ? 70 : 0,
        technicalSkill: i === 5 ? 90 : i === 7 ? 70 : 0,
        screenPresence: i === 5 ? 90 : i === 7 ? 70 : 0,
        chemistryInteraction: i === 5 ? 90 : i === 7 ? 70 : 0,
      })
    )
    const entries = buildActorCrawlShellEntries(actor, performances, ACTOR_CRAWL_SHELL_LIMIT)
    expect(entries).toHaveLength(ACTOR_CRAWL_SHELL_LIMIT)
    expect(entries[0]?.movieTitle).toBe("Film 5")
    expect(entries[0]?.scoreLabel).toBe("9.0/10")
    expect(entries[0]?.rateHref).toBe("/rate/film-5-1985/test-actor")
    expect(entries[0]?.movieHref).toBe("/movies/film-5-1985")
    expect(entries[1]?.movieTitle).toBe("Film 7")
    expect(entries.some((e) => e.scoreLabel === "Be the first to rate")).toBe(true)
  })

  it("does not fabricate scores for zero-rating rows in the shell", () => {
    const entries = buildActorCrawlShellEntries(actor, [
      perf({ movieId: "z", title: "Zero", ratingCount: 0, seededAggregateScore: 9.9 }),
    ])
    expect(entries).toHaveLength(1)
    expect(entries[0]?.scoreLabel).toBe("Be the first to rate")
    expect(entries[0]?.ratingCount).toBe(0)
  })
})
