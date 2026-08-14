/**
 * Source-event grounding — historical filmography must not become a current event.
 * Regressions A–E for Hunger Games / Tobey / Animals / explicit return.
 */

import {
  classifyTitleMentionRole,
  findSourceEventMismatches,
  pickSourceEventTitle,
} from "@/lib/arie/title-mention-role"
import { buildEvidenceLayer } from "@/lib/arie/provenance"
import { runDeterministicOriginalQa } from "@/lib/arie/original-qa"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"
import type { ContextPackage } from "@/lib/arie/types"
import type { OriginalConcept, OriginalDraft } from "@/lib/arie/original-types"

const AMANDLA_COBAB =
  "Tomi Adeyemi responds to the Children of Blood and Bone casting controversy after Amandla Stenberg was discussed for the lead, noting her performance as Rue in The Hunger Games."

const AMANDLA_RETURN = "Amandla Stenberg returns to The Hunger Games in a new chapter."

const TOBEY =
  "Tobey Maguire will return as Spider-Man in Avengers Doomsday"

const ANIMALS =
  "Ben Affleck and Kerry Washington star in the official trailer for Netflix's Animals"

const HISTORICAL_ONLY =
  "Fans still talk about Amandla Stenberg's performance as Rue in The Hunger Games years later."

const amandlaEntities: ExtractedEntities = {
  actors: [
    {
      id: "a-amandla",
      name: "Amandla Stenberg",
      slug: "amandla-stenberg",
      confidence: 95,
    },
  ],
  movies: [
    {
      id: "m-cobab",
      title: "Children of Blood and Bone",
      year: 2027,
      slug: "children-of-blood-and-bone",
      director: null,
      genre: null,
      indexingCohort: 1,
      confidence: 80,
    },
    {
      id: "m-hg",
      title: "The Hunger Games",
      year: 2012,
      slug: "the-hunger-games",
      director: null,
      genre: "Adventure",
      indexingCohort: 1,
      confidence: 85,
    },
  ],
  directors: [],
  unresolved: [],
}

const tobeyEntities: ExtractedEntities = {
  actors: [
    { id: "a-tobey", name: "Tobey Maguire", slug: "tobey-maguire", confidence: 95 },
  ],
  movies: [],
  directors: [],
  unresolved: [],
}

const animalsEntities: ExtractedEntities = {
  actors: [
    { id: "a-ben", name: "Ben Affleck", slug: "ben-affleck", confidence: 95 },
  ],
  movies: [
    {
      id: "m-animals",
      title: "Animals",
      year: 2026,
      slug: "animals",
      director: null,
      genre: null,
      indexingCohort: 1,
      confidence: 80,
    },
  ],
  directors: [],
  unresolved: [],
}

function barePkg(over: Partial<ContextPackage> = {}): ContextPackage {
  return {
    package_id: "t",
    created_at: new Date().toISOString(),
    builder_version: "test",
    event: { text: "test", platform: "X", author_handle: "filmupdates" },
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
    claims: [],
    sourceProvenance: null,
    evidence: null,
    factualConfidence: 70,
    writerMode: "REPORTED_EVENT",
    brand: { constitution_version: "1", constitution_path: "x" },
    unresolved: [],
    graph: { nodes: [], edges: [] },
    budgets: { max_tokens_for_writer: 700, max_claims: 4 },
    coverage: {
      slots: {
        actor: false,
        movie: false,
        radar: false,
        performances: false,
        related: false,
        trend: false,
        community: false,
      },
      present: 0,
      total: 7,
      percent: 0,
    },
    ...over,
  }
}

const concept: OriginalConcept = {
  id: "c1",
  format: "DISCUSSION_DEBATE",
  hook: "craft question",
  angle: "prior work",
  actorRatingAdvantage: "ActorRating prior-work aggregates",
  discussionQuestion: "Who are you taking?",
  dataUsed: ["6.6"],
  visualPotential: "none",
  estimatedStrength: 70,
  riskFlags: [],
}

function draft(text: string): OriginalDraft {
  return {
    text,
    confidence: 70,
    claims: [],
    entities: [],
    links: [],
    sourceReferences: [],
    visual: {
      type: "none",
      title: "",
      subjects: [],
      data: [],
      layout: "none",
      caption: "",
      assetRequirements: [],
      eligible: true,
    },
  }
}

describe("classifyTitleMentionRole", () => {
  it("marks performance-as-Rue Hunger Games as historical", () => {
    expect(classifyTitleMentionRole(AMANDLA_COBAB, "The Hunger Games")).toBe("historical")
    expect(classifyTitleMentionRole(HISTORICAL_ONLY, "The Hunger Games")).toBe("historical")
  })

  it("marks Children of Blood and Bone casting context as event", () => {
    expect(classifyTitleMentionRole(AMANDLA_COBAB, "Children of Blood and Bone")).toBe("event")
  })

  it("marks explicit Amandla return as event", () => {
    expect(classifyTitleMentionRole(AMANDLA_RETURN, "The Hunger Games")).toBe("event")
  })

  it("marks Animals trailer as event", () => {
    expect(classifyTitleMentionRole(ANIMALS, "Animals")).toBe("event")
  })

  it("marks Tobey Doomsday return title as event when present", () => {
    expect(classifyTitleMentionRole(TOBEY, "Avengers Doomsday")).toBe("event")
  })
})

describe("pickSourceEventTitle / primary subject", () => {
  it("A — prefers Children of Blood and Bone over historical Hunger Games", () => {
    const pick = pickSourceEventTitle(AMANDLA_COBAB, [
      "The Hunger Games",
      "Children of Blood and Bone",
    ])
    expect(pick?.title).toBe("Children of Blood and Bone")
    expect(pick?.role).toBe("event")
  })

  it("C — Animals remains the event title", () => {
    expect(pickSourceEventTitle(ANIMALS, ["Animals"])?.title).toBe("Animals")
  })

  it("E — historical-only Hunger Games yields no event title", () => {
    expect(pickSourceEventTitle(HISTORICAL_ONLY, ["The Hunger Games"])).toBeNull()
  })
})

describe("buildEvidenceLayer event binding", () => {
  it("A — does not bind casting/return to historical Hunger Games", () => {
    const { claims } = buildEvidenceLayer({
      text: AMANDLA_COBAB,
      authorHandle: "filmupdates",
      entities: amandlaEntities,
      facts: [],
    })
    const eventClaims = claims.filter(
      (c) => c.predicate === "reported_return" || c.predicate === "reported_casting",
    )
    expect(eventClaims.some((c) => /hunger games/i.test(c.object))).toBe(false)
    const cobab = eventClaims.find((c) => /children of blood and bone/i.test(c.object))
    expect(cobab?.predicate).toBe("reported_casting")
  })

  it("B — Tobey Maguire return still emits reported_return", () => {
    const { claims, evidence } = buildEvidenceLayer({
      text: TOBEY,
      authorHandle: "boinkbuzz",
      entities: tobeyEntities,
      facts: [],
    })
    const casting = claims.find(
      (c) => c.predicate === "reported_return" || c.predicate === "reported_casting",
    )
    expect(casting).toBeTruthy()
    expect(casting?.predicate).toBe("reported_return")
    expect(casting?.status).toBe("REPORTED")
    expect(evidence.writerMode).toBe("REPORTED_EVENT")
  })

  it("D — explicit Amandla return binds reported_return to Hunger Games", () => {
    const { claims } = buildEvidenceLayer({
      text: AMANDLA_RETURN,
      authorHandle: "filmupdates",
      entities: {
        ...amandlaEntities,
        movies: amandlaEntities.movies.filter((m) => m.title === "The Hunger Games"),
      },
      facts: [],
    })
    const ret = claims.find((c) => c.predicate === "reported_return")
    expect(ret?.object).toMatch(/hunger games/i)
  })

  it("E — historical-only mention does not create Hunger Games casting/return claim", () => {
    const { claims } = buildEvidenceLayer({
      text: HISTORICAL_ONLY,
      authorHandle: "filmupdates",
      entities: {
        ...amandlaEntities,
        movies: amandlaEntities.movies.filter((m) => m.title === "The Hunger Games"),
      },
      facts: [],
    })
    const eventClaims = claims.filter(
      (c) => c.predicate === "reported_return" || c.predicate === "reported_casting",
    )
    expect(eventClaims.some((c) => /hunger games/i.test(c.object))).toBe(false)
  })
})

describe("findSourceEventMismatches + Original QA", () => {
  it("A — attributed Hunger Games return draft hard-fails HISTORICAL_AS_CURRENT_EVENT", () => {
    const badDraft =
      "filmupdates reports Amandla Stenberg's return to The Hunger Games. How does her past work in Colombiana (6.6/10) and Dear Evan Hansen (6.3/10) on ActorRating influence your expectations?"

    const mismatches = findSourceEventMismatches(badDraft, AMANDLA_COBAB, [
      "The Hunger Games",
      "Children of Blood and Bone",
      "Colombiana",
      "Dear Evan Hansen",
    ])
    expect(mismatches.some((m) => m.type === "HISTORICAL_AS_CURRENT_EVENT")).toBe(true)
    expect(mismatches.some((m) => /hunger games/i.test(m.title))).toBe(true)

    const { claims } = buildEvidenceLayer({
      text: AMANDLA_COBAB,
      authorHandle: "filmupdates",
      entities: amandlaEntities,
      facts: [
        {
          fact_id: "perf:prior:colombiana",
          type: "aggregate_score",
          text: "Prior work — Amandla Stenberg in Colombiana (2011): aggregate 6.6/10 on ActorRating (not a score for the newly announced role)",
          value: 6.6,
          source: "actorrating_db",
          as_of: new Date().toISOString(),
          entity_refs: ["actor:a-amandla", "movie:m-col"],
        },
        {
          fact_id: "perf:prior:deh",
          type: "aggregate_score",
          text: "Prior work — Amandla Stenberg in Dear Evan Hansen (2021): aggregate 6.3/10 on ActorRating (not a score for the newly announced role)",
          value: 6.3,
          source: "actorrating_db",
          as_of: new Date().toISOString(),
          entity_refs: ["actor:a-amandla", "movie:m-deh"],
        },
      ],
    })

    const qa = runDeterministicOriginalQa({
      draft: draft(badDraft),
      concept,
      package: barePkg({
        event: { text: AMANDLA_COBAB, platform: "X", author_handle: "filmupdates" },
        movie: {
          id: "m-cobab",
          title: "Children of Blood and Bone",
          year: 2027,
          slug: "children-of-blood-and-bone",
          director: null,
          genre: null,
          indexingCohort: 1,
        },
        actor: {
          id: "a-amandla",
          name: "Amandla Stenberg",
          slug: "amandla-stenberg",
          knownFor: null,
        },
        claims,
        facts: [
          {
            fact_id: "perf:prior:colombiana",
            type: "aggregate_score",
            text: "Prior work — Amandla Stenberg in Colombiana (2011): aggregate 6.6/10 on ActorRating (not a score for the newly announced role)",
            value: 6.6,
            source: "actorrating_db",
            as_of: new Date().toISOString(),
            entity_refs: [],
          },
          {
            fact_id: "perf:prior:deh",
            type: "aggregate_score",
            text: "Prior work — Amandla Stenberg in Dear Evan Hansen (2021): aggregate 6.3/10 on ActorRating (not a score for the newly announced role)",
            value: 6.3,
            source: "actorrating_db",
            as_of: new Date().toISOString(),
            entity_refs: [],
          },
        ],
      }),
    })
    expect(qa.passed).toBe(false)
    expect(qa.errors).toContain("HISTORICAL_AS_CURRENT_EVENT")
    expect(qa.issues.some((i) => i.type === "HISTORICAL_AS_CURRENT_EVENT")).toBe(true)
  })

  it("B — attributed Tobey Doomsday return still passes source-event check", () => {
    const good =
      "BoinkBuzz is reporting Tobey Maguire's return in Avengers Doomsday. How do his Spider-Man aggregates on ActorRating set expectations?"
    const mismatches = findSourceEventMismatches(good, TOBEY, ["Avengers Doomsday"])
    expect(mismatches).toEqual([])
  })

  it("C — Animals trailer draft does not trip source-event mismatch", () => {
    const good =
      "The Animals trailer is here. How do Ben Affleck's prior ActorRating scores shape your expectations?"
    expect(findSourceEventMismatches(good, ANIMALS, ["Animals"])).toEqual([])
  })

  it("D — explicit Amandla return draft is accepted by source-event check", () => {
    const good =
      "filmupdates reports Amandla Stenberg returns to The Hunger Games. Which prior ActorRating performance sets the bar?"
    expect(
      findSourceEventMismatches(good, AMANDLA_RETURN, ["The Hunger Games"]),
    ).toEqual([])
  })

  it("E — inventing a Hunger Games return from historical-only source fails", () => {
    const bad =
      "filmupdates reports Amandla Stenberg's return to The Hunger Games based on her Rue legacy."
    const mismatches = findSourceEventMismatches(bad, HISTORICAL_ONLY, ["The Hunger Games"])
    expect(mismatches.some((m) => m.type === "HISTORICAL_AS_CURRENT_EVENT")).toBe(true)
  })
})

describe("Come With Me — legitimate attributed casting + prior-work comparison", () => {
  const SOURCE =
    "'Come With Me,' Psychological Thriller Starring Theo Rossi and Ron Perlman, Sells to Vertical and Gets First Trailer (Exclusive)"
  const DRAFT =
    "THR is reporting Ron Perlman and Theo Rossi are set to star in 'Come With Me'. How will their performances compare to past work like Ron in 'A Stoning in Fulham County' (1988) or Theo in 'The Getback' (2023)?"

  const entities: ExtractedEntities = {
    actors: [
      { id: "a-ron", name: "Ron Perlman", slug: "ron-perlman", confidence: 95 },
      { id: "a-theo", name: "Theo Rossi", slug: "theo-rossi", confidence: 95 },
    ],
    movies: [
      {
        id: "m-cwm",
        title: "Come With Me",
        year: 2026,
        slug: "come-with-me",
        director: null,
        genre: null,
        indexingCohort: 1,
        confidence: 90,
      },
    ],
    directors: [],
    unresolved: [],
  }

  const priorFacts = [
    {
      fact_id: "perf:prior:stoning",
      type: "aggregate_score" as const,
      text: "Prior work — Ron Perlman in A Stoning in Fulham County (1988): aggregate 7.1/10 on ActorRating (not a score for the newly announced role)",
      value: 7.1,
      source: "actorrating_db" as const,
      as_of: new Date().toISOString(),
      entity_refs: ["actor:a-ron"],
    },
    {
      fact_id: "perf:prior:getback",
      type: "aggregate_score" as const,
      text: "Prior work — Theo Rossi in The Getback (2023): aggregate 6.8/10 on ActorRating (not a score for the newly announced role)",
      value: 6.8,
      source: "actorrating_db" as const,
      as_of: new Date().toISOString(),
      entity_refs: ["actor:a-theo"],
    },
  ]

  it("classifies Come With Me as the source event (headline starring/trailer)", () => {
    expect(classifyTitleMentionRole(SOURCE, "Come With Me")).toBe("event")
  })

  it("does not treat prior-work titles in the draft as current-event mismatches", () => {
    const mismatches = findSourceEventMismatches(DRAFT, SOURCE, [
      "Come With Me",
      "A Stoning in Fulham County",
      "The Getback",
    ])
    expect(mismatches).toEqual([])
  })

  it("deterministic QA passes for the attributed THR draft with prior-work years", () => {
    const { claims } = buildEvidenceLayer({
      text: SOURCE,
      authorHandle: "thr",
      entities,
      facts: priorFacts,
    })
    const qa = runDeterministicOriginalQa({
      draft: draft(DRAFT),
      concept,
      package: barePkg({
        event: { text: SOURCE, platform: "X", author_handle: "thr" },
        movie: {
          id: "m-cwm",
          title: "Come With Me",
          year: 2026,
          slug: "come-with-me",
          director: null,
          genre: null,
          indexingCohort: 1,
        },
        actor: {
          id: "a-ron",
          name: "Ron Perlman",
          slug: "ron-perlman",
          knownFor: null,
        },
        actors: [
          { id: "a-ron", name: "Ron Perlman", slug: "ron-perlman", role: "primary" },
          { id: "a-theo", name: "Theo Rossi", slug: "theo-rossi", role: "mentioned" },
        ],
        claims,
        facts: priorFacts,
        writerMode: "REPORTED_EVENT",
      }),
    })
    expect(qa.errors).not.toContain("SOURCE_EVENT_MISMATCH")
    expect(qa.errors).not.toContain("HISTORICAL_AS_CURRENT_EVENT")
    expect(qa.errors.filter((e) => e.startsWith("invented_numbers"))).toEqual([])
    expect(qa.passed).toBe(true)
  })
})
