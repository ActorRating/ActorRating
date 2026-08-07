import { scoreOpportunity } from "@/lib/arie/opportunity-score"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"

const empty: ExtractedEntities = { actors: [], movies: [], directors: [], unresolved: [] }

const holland: ExtractedEntities = {
  actors: [
    { id: "a1", name: "Tom Holland", slug: "tom-holland", confidence: 90 },
    { id: "a2", name: "Zendaya", slug: "zendaya", confidence: 90 },
  ],
  movies: [],
  directors: [],
  unresolved: [],
}

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
    expect(r.decision).toBe("ignore")
  })

  it("always ignores wedding/relationship gossip on priority accounts", () => {
    const r = scoreOpportunity({
      text: "Tom Holland & his now Confirmed Wife, Zendaya step out for a coffee date wearing wedding bands",
      authorHandle: "boinkbuzz",
      entities: holland,
      ageMinutes: 5,
    })
    expect(r.decision).toBe("ignore")
    expect(r.reasonCodes).toEqual(expect.arrayContaining(["off_brand_gossip", "ignored_off_brand"]))
  })

  it("always ignores music-video / promo noise", () => {
    const r = scoreOpportunity({
      text: "Alden Ehrenreich stars in Carly Rae Jepsen’s music video for Don’t Leave Me On the Dancefloor.",
      authorHandle: "filmupdates",
      entities: {
        actors: [{ id: "a1", name: "Alden Ehrenreich", slug: "alden-ehrenreich", confidence: 90 }],
        movies: [],
        directors: [],
        unresolved: [],
      },
    })
    expect(r.decision).toBe("ignore")
    expect(r.reasonCodes).toEqual(expect.arrayContaining(["off_brand_promo"]))
  })

  it("always ignores toxic fan dunking even with high entity coverage", () => {
    const r = scoreOpportunity({
      text: 'Marvel Fans are now Clowning Jon Bernthal for acting too feminine while promoting Spider-man',
      authorHandle: "boinkbuzz",
      entities: {
        actors: [{ id: "a1", name: "Jon Bernthal", slug: "jon-bernthal", confidence: 90 }],
        movies: [
          {
            id: "m1",
            title: "Spider-Man: Brand New Day",
            year: 2026,
            slug: "spider-man-brand-new-day",
            director: null,
            genre: null,
            indexingCohort: 0,
            confidence: 80,
          },
        ],
        directors: [],
        unresolved: [],
      },
    })
    expect(r.decision).toBe("ignore")
    expect(r.reasonCodes).toEqual(expect.arrayContaining(["off_brand_toxic_fan"]))
  })

  it("still processes MCU casting / farewell confirmation news", () => {
    const cast = scoreOpportunity({
      text: "Kit Connor & Sadie Sink are Officially cast as Cyclops & Jean Grey in the new X-Men Reboot",
      authorHandle: "boinkbuzz",
      entities: {
        actors: [
          { id: "a1", name: "Kit Connor", slug: "kit-connor", confidence: 90 },
          { id: "a2", name: "Sadie Sink", slug: "sadie-sink", confidence: 90 },
        ],
        movies: [],
        directors: [],
        unresolved: [],
      },
    })
    expect(cast.decision).toBe("process")

    const farewell = scoreOpportunity({
      text: "Elizabeth Olsen officially confirms Avengers: Secret Wars will be her final movie as the Scarlet Witch, bringing her iconic 13-year run to an end.",
      authorHandle: "chaoscrave",
      entities: {
        actors: [{ id: "a1", name: "Elizabeth Olsen", slug: "elizabeth-olsen", confidence: 90 }],
        movies: [],
        directors: [],
        unresolved: [],
      },
    })
    expect(farewell.decision).toBe("process")
  })

  it("penalizes classic gossip / politics relevance", () => {
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
    expect(r.decision).toBe("ignore")
  })
})
