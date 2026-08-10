import {
  buildOriginalDedupeKey,
  classifyOriginalEventType,
  originalExpiresAt,
  scoreOriginalOpportunity,
} from "@/lib/arie/original-score"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"
import {
  conceptsAreDistinct,
  parseConceptsArray,
} from "@/lib/arie/original-types"
import { findInventedNumbers } from "@/lib/arie/original-writer"
import { runDeterministicOriginalQa } from "@/lib/arie/original-qa"
import { arieOriginalPublishEnabled } from "@/lib/arie/config"
import type { ContextPackage } from "@/lib/arie/types"
import type { OriginalConcept, OriginalDraft } from "@/lib/arie/original-types"

const empty: ExtractedEntities = { actors: [], movies: [], directors: [], unresolved: [] }

const dicaprioNolan: ExtractedEntities = {
  actors: [
    { id: "a-leo", name: "Leonardo DiCaprio", slug: "leonardo-dicaprio", confidence: 95 },
  ],
  movies: [],
  directors: [{ name: "Christopher Nolan", confidence: 90 }],
  unresolved: [],
}

const tobey: ExtractedEntities = {
  actors: [
    { id: "a-tobey", name: "Tobey Maguire", slug: "tobey-maguire", confidence: 95 },
    { id: "a-andrew", name: "Andrew Garfield", slug: "andrew-garfield", confidence: 90 },
    { id: "a-tom", name: "Tom Holland", slug: "tom-holland", confidence: 90 },
  ],
  movies: [
    {
      id: "m-sm",
      title: "Spider-Man",
      year: 2002,
      slug: "spider-man",
      director: null,
      genre: "Action",
      indexingCohort: 1,
      confidence: 80,
    },
  ],
  directors: [],
  unresolved: [],
}

function richContext(entities: ExtractedEntities): ContextPackage {
  return {
    package_id: "test",
    created_at: new Date().toISOString(),
    builder_version: "test",
    event: { text: "test", platform: "X" },
    opportunity: {
      score: 80,
      breakdown: {
        relevance: 80,
        virality: 70,
        arContext: 70,
        uniqueness: 70,
        competition: 50,
        freshness: 90,
      },
      decision: "process",
      suggestedFormat: "reply",
      reasonCodes: [],
      priorityAuthor: true,
    },
    movie: entities.movies[0]
      ? {
          id: entities.movies[0].id,
          title: entities.movies[0].title,
          year: entities.movies[0].year,
          slug: entities.movies[0].slug,
          director: null,
          genre: null,
          indexingCohort: 1,
        }
      : null,
    actor: entities.actors[0]
      ? {
          id: entities.actors[0].id,
          name: entities.actors[0].name,
          slug: entities.actors[0].slug,
          knownFor: null,
        }
      : null,
    actors: entities.actors.map((a, i) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      role: i === 0 ? "primary" : "mentioned",
    })),
    director: entities.directors[0]
      ? { name: entities.directors[0].name, filmCount: 10, notableFilms: [] }
      : null,
    radar: {
      actorId: entities.actors[0]?.id ?? "x",
      movieId: entities.movies[0]?.id ?? "y",
      actorName: entities.actors[0]?.name ?? "A",
      movieTitle: entities.movies[0]?.title ?? "M",
      dimensions: {
        screenPresence: 8.1,
        emotionalImpact: 7.5,
        technicalSkill: 7.8,
        characterDepth: 8.0,
        originality: 7.2,
      },
      strongest: ["screenPresence"],
      weakest: ["originality"],
      seededAggregate: 7.7,
    },
    topPerformances: [
      {
        actorId: "a-tobey",
        movieId: "m1",
        actorName: "Tobey Maguire",
        movieTitle: "Spider-Man",
        movieYear: 2002,
        character: "Peter Parker",
        seededAggregate: 8.2,
        ratingCount: 120,
        href: "/performances/x",
      },
      {
        actorId: "a-andrew",
        movieId: "m2",
        actorName: "Andrew Garfield",
        movieTitle: "The Amazing Spider-Man",
        movieYear: 2012,
        character: "Peter Parker",
        seededAggregate: 7.9,
        ratingCount: 90,
        href: "/performances/y",
      },
    ],
    communityRating: { actorId: "a", movieId: "m", ratingCount: 40, avg10: 8.0 },
    relatedPerformances: [],
    currentTrend: null,
    similarActors: [],
    links: [],
    facts: [
      {
        fact_id: "f1",
        type: "aggregate_score",
        text: "Tobey Maguire in Spider-Man: 8.2/10",
        value: 8.2,
        entity_refs: [],
        source: "actorrating_db",
        as_of: new Date().toISOString(),
      },
    ],
    brand: { constitution_version: "1.0", constitution_path: "x" },
    unresolved: [],
    graph: { nodes: [], edges: [] },
    budgets: { max_tokens_for_writer: 800, max_claims: 4 },
    coverage: {
      slots: {
        actor: true,
        movie: true,
        director: false,
        radar: true,
        comparisons: true,
        awards: false,
        community: true,
      },
      present: 5,
      total: 7,
      percent: 71,
    },
  }
}

describe("original opportunity score", () => {
  it("scores major casting highly when context is rich", () => {
    const r = scoreOriginalOpportunity({
      text: "Leonardo DiCaprio joins Christopher Nolan's next film.",
      authorHandle: "deadline",
      entities: dicaprioNolan,
      context: richContext(dicaprioNolan),
      ageMinutes: 10,
    })
    expect(r.eventType).toBe("casting")
    expect(r.eligible).toBe(true)
    expect(r.score).toBeGreaterThanOrEqual(55)
    expect(r.breakdown.heat + r.breakdown.relevance).toBeGreaterThan(20)
    expect(r.velocity).toBe("unknown")
  })

  it("ignores gossip / music promo", () => {
    const gossip = scoreOriginalOpportunity({
      text: "Tom Holland and Zendaya spotted on a coffee date wearing wedding bands",
      authorHandle: "boinkbuzz",
      entities: tobey,
      ageMinutes: 5,
    })
    expect(gossip.eligible).toBe(false)

    const music = scoreOriginalOpportunity({
      text: "New Zendaya music video drops Friday — stream now",
      authorHandle: "variety",
      entities: empty,
      ageMinutes: 5,
    })
    expect(music.eligible).toBe(false)
  })

  it("marks weak events with no entities ineligible", () => {
    const r = scoreOriginalOpportunity({
      text: "Huge industry shakeup happening rn",
      authorHandle: "randomfan",
      entities: empty,
      ageMinutes: 5,
    })
    expect(r.eligible).toBe(false)
    expect(r.reasonCodes).toEqual(
      expect.arrayContaining(["insufficient_data_advantage", "missing_core_entities"]),
    )
  })

  it("uses heatHint for velocity when provided — never invents otherwise", () => {
    const unknown = scoreOriginalOpportunity({
      text: "Tobey Maguire will reportedly return as Spider-Man.",
      authorHandle: "boinkbuzz",
      entities: tobey,
      context: richContext(tobey),
    })
    expect(unknown.velocity).toBe("unknown")
    expect(unknown.reasonCodes).toContain("velocity_unknown")

    const hot = scoreOriginalOpportunity({
      text: "Tobey Maguire will reportedly return as Spider-Man.",
      authorHandle: "boinkbuzz",
      entities: tobey,
      context: richContext(tobey),
      heatHint: 92,
    })
    expect(hot.velocity).toBe("exploding")
    expect(hot.breakdown.heat).toBeGreaterThan(unknown.breakdown.heat)
  })
})

describe("original dedupe + expiration", () => {
  it("builds same dedupe key for same casting cluster", () => {
    const a = buildOriginalDedupeKey({
      eventType: "casting",
      entities: dicaprioNolan,
      text: "Leonardo DiCaprio joins Nolan film",
    })
    const b = buildOriginalDedupeKey({
      eventType: "casting",
      entities: dicaprioNolan,
      text: "BREAKING: DiCaprio boards Nolan project",
    })
    expect(a).toBe(b)
  })

  it("sets shorter TTL for casting than ranking debates", () => {
    const from = new Date("2026-08-10T12:00:00Z")
    const casting = originalExpiresAt("casting", from).getTime() - from.getTime()
    const ranking = originalExpiresAt("ranking_debate", from).getTime() - from.getTime()
    expect(casting).toBeLessThan(ranking)
  })

  it("classifies event types", () => {
    expect(classifyOriginalEventType("Official trailer for Dune drops")).toBe("trailer")
    expect(classifyOriginalEventType("Oscar nominations announced")).toBe("awards")
  })
})

describe("concept schema + distinctness", () => {
  it("parses valid concepts", () => {
    const parsed = parseConceptsArray([
      {
        format: "COMPARISON",
        hook: "Tobey vs Andrew vs Tom",
        angle: "Spider-Man craft comparison",
        actorRatingAdvantage: "radar + aggregates",
        discussionQuestion: "Who are you taking?",
        dataUsed: ["8.2"],
        visualPotential: "radar",
        estimatedStrength: 88,
      },
      {
        format: "RANKING",
        hook: "Tobey's Spider-Man films ranked",
        angle: "franchise ranking",
        actorRatingAdvantage: "performance list",
        discussionQuestion: "Which rank is wrong?",
        dataUsed: ["performances"],
        visualPotential: "list",
        estimatedStrength: 80,
      },
    ])
    expect(parsed.ok).toBe(true)
  })

  it("rejects near-duplicate concepts", () => {
    const concepts: OriginalConcept[] = [
      {
        id: "c1",
        format: "RANKING",
        hook: "Tobey's Spider-Man performances ranked on ActorRating",
        angle: "rank the three films",
        actorRatingAdvantage: "scores",
        discussionQuestion: "Which is #1?",
        dataUsed: [],
        visualPotential: "list",
        estimatedStrength: 80,
        riskFlags: [],
      },
      {
        id: "c2",
        format: "RANKING",
        hook: "Tobey's Spider-Man performances ranked on ActorRating today",
        angle: "rank the three films again",
        actorRatingAdvantage: "scores",
        discussionQuestion: "Which is number one?",
        dataUsed: [],
        visualPotential: "list",
        estimatedStrength: 79,
        riskFlags: [],
      },
    ]
    expect(conceptsAreDistinct(concepts).ok).toBe(false)
  })
})

describe("original draft QA guards", () => {
  it("flags invented numbers", () => {
    expect(findInventedNumbers("Tobey scores 9.7 on our board", [8.2, 7.9])).toContain("9.7")
    expect(findInventedNumbers("Tobey at 8.2 — who tops him?", [8.2])).toEqual([])
  })

  it("fails deterministic QA on overlength / invented stats / missing advantage", () => {
    const draft: OriginalDraft = {
      text: "Confirmed: Tobey averages 9.99 forever. " + "x".repeat(250),
      visual: {
        type: "none",
        title: "",
        subjects: [],
        data: [],
        layout: "none",
        caption: "",
        assetRequirements: [],
        eligible: false,
      },
      entities: [],
      links: [],
      sourceReferences: [],
      confidence: 50,
      claims: [],
    }
    const concept: OriginalConcept = {
      id: "c1",
      format: "RANKING",
      hook: "x",
      angle: "y",
      actorRatingAdvantage: "",
      discussionQuestion: "?",
      dataUsed: [],
      visualPotential: "none",
      estimatedStrength: 50,
      riskFlags: [],
    }
    const qa = runDeterministicOriginalQa({
      draft,
      concept,
      package: richContext(tobey),
    })
    expect(qa.passed).toBe(false)
    expect(qa.errors.some((e) => e.includes("over_280") || e.includes("invented") || e.includes("advantage"))).toBe(
      true,
    )
  })

  it("passes a grounded short draft", () => {
    const draft: OriginalDraft = {
      text: "Tobey Maguire's Spider-Man sits at 8.2 on ActorRating. Where does Andrew land for you?",
      visual: {
        type: "ranked_list",
        title: "t",
        subjects: ["Tobey"],
        data: [{ label: "Tobey", value: 8.2, source: "actorrating_db" }],
        layout: "list",
        caption: "",
        assetRequirements: [],
        eligible: true,
      },
      entities: [],
      links: [],
      sourceReferences: [],
      confidence: 80,
      claims: ["8.2 aggregate"],
    }
    const concept: OriginalConcept = {
      id: "c1",
      format: "RANKING",
      hook: "Tobey ranked",
      angle: "scores",
      actorRatingAdvantage: "performance aggregates",
      discussionQuestion: "Where does Andrew land?",
      dataUsed: ["8.2"],
      visualPotential: "list",
      estimatedStrength: 85,
      riskFlags: [],
    }
    const qa = runDeterministicOriginalQa({
      draft,
      concept,
      package: richContext(tobey),
    })
    expect(qa.passed).toBe(true)
  })
})

describe("original publish flag", () => {
  const prev = process.env.ARIE_ORIGINAL_PUBLISH_ENABLED
  afterEach(() => {
    if (prev === undefined) delete process.env.ARIE_ORIGINAL_PUBLISH_ENABLED
    else process.env.ARIE_ORIGINAL_PUBLISH_ENABLED = prev
  })

  it("defaults to disabled", () => {
    delete process.env.ARIE_ORIGINAL_PUBLISH_ENABLED
    expect(arieOriginalPublishEnabled()).toBe(false)
  })

  it("enables only when explicitly true", () => {
    process.env.ARIE_ORIGINAL_PUBLISH_ENABLED = "true"
    expect(arieOriginalPublishEnabled()).toBe(true)
  })
})
