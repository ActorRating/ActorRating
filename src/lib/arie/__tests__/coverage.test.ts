import { computeContextCoverage } from "@/lib/arie/coverage"
import type { ContextPackage } from "@/lib/arie/types"

function barePkg(over: Partial<ContextPackage> = {}): Omit<ContextPackage, "coverage"> {
  return {
    package_id: "t",
    created_at: new Date().toISOString(),
    builder_version: "test",
    event: { text: "hello", platform: "X" },
    opportunity: {
      score: 80,
      breakdown: {
        relevance: 80,
        virality: 80,
        arContext: 80,
        uniqueness: 80,
        competition: 80,
        freshness: 80,
      },
      decision: "process",
      suggestedFormat: "reply",
      reasonCodes: [],
      priorityAuthor: true,
    },
    movie: null,
    actor: null,
    actors: [],
    director: null,
    radar: null,
    topPerformances: [],
    communityRating: null,
    relatedPerformances: [],
    currentTrend: null,
    similarActors: [],
    links: [],
    facts: [],
    brand: { constitution_version: "1.0", constitution_path: "x" },
    unresolved: [],
    graph: { nodes: [], edges: [] },
    budgets: { max_tokens_for_writer: 700, max_claims: 4 },
    ...over,
  }
}

describe("arie context coverage", () => {
  it("scores empty package near zero", () => {
    const c = computeContextCoverage(barePkg())
    expect(c.present).toBe(0)
    expect(c.percent).toBe(0)
  })

  it("counts filled slots", () => {
    const c = computeContextCoverage(
      barePkg({
        actor: { id: "a", name: "Leo", slug: null, knownFor: null },
        movie: {
          id: "m",
          title: "Inception",
          year: 2010,
          slug: null,
          director: "Nolan",
          genre: null,
          indexingCohort: 1,
        },
        director: { name: "Christopher Nolan", filmCount: 10, notableFilms: [] },
        radar: {
          actorId: "a",
          movieId: "m",
          actorName: "Leo",
          movieTitle: "Inception",
          dimensions: { screenPresence: 8.2 },
          strongest: ["Screen Presence"],
          weakest: [],
          seededAggregate: 8,
        },
        relatedPerformances: [
          { actorName: "X", movieTitle: "Y", movieYear: 2010, href: null, note: "" },
        ],
        communityRating: { actorId: "a", movieId: "m", ratingCount: 12, avg10: 8.1 },
      }),
    )
    expect(c.slots.actor).toBe(true)
    expect(c.slots.movie).toBe(true)
    expect(c.slots.director).toBe(true)
    expect(c.slots.radar).toBe(true)
    expect(c.slots.comparisons).toBe(true)
    expect(c.slots.community).toBe(true)
    expect(c.slots.awards).toBe(false)
    expect(c.present).toBe(6)
    expect(c.percent).toBe(Math.round((6 / 7) * 100))
  })
})
