import { scoreOpportunity } from "@/lib/arie/opportunity-score"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"

const empty: ExtractedEntities = { actors: [], movies: [], directors: [], unresolved: [] }

describe("arie opportunity score", () => {
  it("scores Deadline casting news with entities highly", () => {
    const entities: ExtractedEntities = {
      actors: [{ id: "a1", name: "Leonardo DiCaprio", slug: "leonardo-dicaprio", confidence: 92 }],
      movies: [],
      directors: [{ name: "Christopher Nolan", confidence: 88 }],
      unresolved: [],
    }
    const r = scoreOpportunity({
      text: "Leonardo DiCaprio joins Nolan's next film.",
      authorHandle: "deadline",
      entities,
      ageMinutes: 5,
    })
    expect(r.priorityAuthor).toBe(true)
    expect(r.score).toBeGreaterThanOrEqual(70)
    expect(r.decision).toBe("process")
  })

  it("ignores low-context random posts", () => {
    const r = scoreOpportunity({
      text: "lol this weather tho",
      authorHandle: "randomfan123",
      entities: empty,
      ageMinutes: 5,
    })
    expect(r.score).toBeLessThan(50)
    expect(r.decision).toBe("ignore")
  })

  it("penalizes gossip / politics", () => {
    const r = scoreOpportunity({
      text: "Actor dating scandal rocks Hollywood election stage",
      authorHandle: "deadline",
      entities: {
        actors: [{ id: "a1", name: "Someone Famous", slug: null, confidence: 80 }],
        movies: [],
        directors: [],
        unresolved: [],
      },
    })
    expect(r.breakdown.relevance).toBeLessThanOrEqual(25)
  })
})
