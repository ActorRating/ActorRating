/**
 * Concept-generation eligibility — flat stored score + pipeline status as source of truth.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    arieOpportunity: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    arieContextPackage: {
      findFirst: jest.fn(),
    },
    arieLog: { create: jest.fn() },
  },
}))

jest.mock("@/lib/arie/original-concepts", () => ({
  generateOriginalConcepts: jest.fn(),
}))

jest.mock("@/lib/arie/log", () => ({
  arieLog: jest.fn(),
}))

import { prisma } from "@/lib/prisma"
import { generateOriginalConcepts } from "@/lib/arie/original-concepts"
import {
  entitiesFromContextPackage,
  evaluateConceptGenerationEligibility,
  evaluateSourceSubjectMatch,
  generateConceptsForOpportunity,
  reconstructScore,
} from "@/lib/arie/original-pipeline"
import { evaluateScoutExclusion } from "@/lib/arie/scout-exclusions"
import type { ContextPackage } from "@/lib/arie/types"
import type { OriginalConcept, OriginalScoreResult } from "@/lib/arie/original-types"

const prismaMock = prisma as unknown as {
  arieOpportunity: { findUnique: jest.Mock; update: jest.Mock }
  arieContextPackage: { findFirst: jest.Mock }
}

const generateConceptsMock = generateOriginalConcepts as jest.Mock

const filmupdatesFlatBreakdown = {
  heat: 26,
  relevance: 18,
  visual: 16,
  discussion: 8,
  data: 8,
  timing: 5,
  reasonCodes: ["velocity_unknown", "original_eligible"],
  eventType: "awards",
  velocity: "unknown",
  actorRatingAdvantage:
    "8 ActorRating performance score(s), related performance comparisons, director filmography context (awards)",
  eligible: true,
}

const ineligibleFlatBreakdown = {
  heat: 4,
  relevance: 4,
  visual: 3,
  discussion: 3,
  data: 1,
  timing: 2,
  reasonCodes: ["original_ineligible", "missing_core_entities"],
  eventType: "ignore",
  velocity: "unknown",
  actorRatingAdvantage: "No clear ActorRating advantage",
  eligible: false,
}

function eligibleScore(over: Partial<OriginalScoreResult> = {}): OriginalScoreResult {
  return {
    score: 77,
    breakdown: { heat: 26, relevance: 18, visual: 16, discussion: 8, data: 8, timing: 5 },
    eligible: true,
    reasonCodes: ["original_eligible"],
    eventType: "awards",
    velocity: "unknown",
    actorRatingAdvantage: "ActorRating can add: performances (awards)",
    ...over,
  }
}

function filmupdatesPackage(text: string): ContextPackage {
  return {
    package_id: "pkg-fu",
    created_at: new Date().toISOString(),
    builder_version: "test",
    event: {
      text,
      platform: "X",
      author_handle: "filmupdates",
    },
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
    movie: {
      id: "m-coda",
      title: "CODA",
      year: 2021,
      slug: "coda",
      director: "Sian Heder",
      genre: "Drama",
      indexingCohort: 1,
    },
    actor: {
      id: "a-emilia",
      name: "Emilia Jones",
      slug: "emilia-jones",
      knownFor: null,
    },
    actors: [{ id: "a-emilia", name: "Emilia Jones", slug: "emilia-jones", role: "primary" }],
    director: { name: "Sian Heder", filmCount: 4, notableFilms: ["CODA"] },
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
    factualConfidence: 80,
    writerMode: "VERIFIED_EVENT",
    brand: { constitution_version: "1", constitution_path: "x" },
    unresolved: [],
    graph: { nodes: [], edges: [] },
    budgets: { max_tokens_for_writer: 800, max_claims: 8 },
    coverage: {
      slots: {
        actor: true,
        movie: true,
        radar: false,
        performances: false,
        related: false,
        trend: false,
        community: false,
      },
      present: 2,
      total: 7,
      percent: 28,
    },
  }
}

describe("reconstructScore — stored flat originalScoreBreakdown", () => {
  it("reads heat/data/eligible from the flat ingest shape (draft/QA path)", () => {
    const score = reconstructScore({
      originalScore: 77,
      originalScoreBreakdown: filmupdatesFlatBreakdown,
    })
    expect(score.score).toBe(77)
    expect(score.breakdown.data).toBe(8)
    expect(score.breakdown.heat).toBe(26)
    expect(score.eligible).toBe(true)
    expect(score.eventType).toBe("awards")
    expect(score.reasonCodes).toContain("original_eligible")
    expect(score.actorRatingAdvantage).toContain("ActorRating performance score")
  })
})

describe("evaluateConceptGenerationEligibility", () => {
  it("lets ELIGIBLE through even if reconstructed eligible is stale false", () => {
    const r = evaluateConceptGenerationEligibility({
      originalStatus: "ELIGIBLE",
      score: eligibleScore({ eligible: false }),
    })
    expect(r).toEqual({ ok: true })
  })

  it("lets later pipeline statuses through", () => {
    for (const status of ["CONCEPTS_GENERATED", "DRAFT_GENERATED", "QA_PASSED", "READY"] as const) {
      expect(
        evaluateConceptGenerationEligibility({
          originalStatus: status,
          score: eligibleScore({ eligible: false }),
        }).ok,
      ).toBe(true)
    }
  })

  it("rejects IGNORED even with a high reconstructed score", () => {
    const r = evaluateConceptGenerationEligibility({
      originalStatus: "IGNORED",
      score: eligibleScore(),
    })
    expect(r).toEqual({ ok: false, reason: "not_eligible" })
  })

  it("rejects a genuinely ineligible NEW/SCORED row", () => {
    const score = reconstructScore({
      originalScore: 40,
      originalScoreBreakdown: ineligibleFlatBreakdown,
    })
    expect(score.eligible).toBe(false)
    expect(
      evaluateConceptGenerationEligibility({ originalStatus: "SCORED", score }),
    ).toEqual({ ok: false, reason: "not_eligible" })
  })

  it("rejects REJECTED and DUPLICATE", () => {
    expect(
      evaluateConceptGenerationEligibility({
        originalStatus: "REJECTED",
        score: eligibleScore(),
      }).reason,
    ).toBe("not_eligible")
    expect(
      evaluateConceptGenerationEligibility({
        originalStatus: "DUPLICATE",
        score: eligibleScore(),
      }).reason,
    ).toBe("not_eligible")
  })
})

describe("Scout inputs for already-ingested eligible opportunities", () => {
  it("does not exclude @filmupdates news when dataScore and entities are real", () => {
    const pkg = filmupdatesPackage(
      "CODA is nominated for Best Picture. Emilia Jones leads the awards conversation.",
    )
    const score = reconstructScore({
      originalScore: 77,
      originalScoreBreakdown: filmupdatesFlatBreakdown,
    })
    const entities = entitiesFromContextPackage(pkg)
    expect(entities.actors.length).toBeGreaterThan(0)
    expect(entities.movies.length).toBeGreaterThan(0)
    expect(score.breakdown.data).toBe(8)
    const scout = evaluateScoutExclusion({
      text: pkg.event.text,
      authorHandle: pkg.event.author_handle,
      entities,
      dataScore: score.breakdown.data,
      offBrand: score.reasonCodes.some((c) => c.startsWith("scout_") || c === "off_brand_topic"),
    })
    expect(scout.excluded).toBe(false)
  })

  it("still rejects genuinely bad Scout candidates", () => {
    const gossip = evaluateScoutExclusion({
      text: "Celebrity couple splits after heated argument at premiere — full drama inside.",
      authorHandle: "filmupdates",
      entities: {
        actors: [{ id: "a1", name: "Someone", slug: "s", confidence: 90 }],
        movies: [],
        directors: [],
        unresolved: [],
      },
      dataScore: 8,
    })
    expect(gossip.excluded).toBe(true)
    expect(gossip.reason).toBe("gossip_celebrity_drama")
  })
})

describe("generateConceptsForOpportunity eligibility path", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.arieOpportunity.update.mockResolvedValue({})
    generateConceptsMock.mockResolvedValue({
      ok: true,
      concepts: [
        {
          id: "c1",
          format: "HISTORICAL_CONTEXT",
          hook: "CODA craft",
          angle: "awards",
          actorRatingAdvantage: "scores",
          discussionQuestion: "Who?",
          dataUsed: ["8.2"],
          visualPotential: "list",
          estimatedStrength: 80,
          riskFlags: [],
          totalScore: 80,
        } satisfies OriginalConcept,
      ],
      selected: {
        id: "c1",
        format: "HISTORICAL_CONTEXT",
        hook: "CODA craft",
        angle: "awards",
        actorRatingAdvantage: "scores",
        discussionQuestion: "Who?",
        dataUsed: ["8.2"],
        visualPotential: "list",
        estimatedStrength: 80,
        riskFlags: [],
        totalScore: 80,
      },
      rankExplanation: "ok",
      model: "test",
      promptVersion: "original-concept@v1.0",
      usage: { promptTokens: 1, completionTokens: 1 },
      generationMs: 1,
    })
  })

  it("ELIGIBLE + flat breakdown no longer returns not_eligible (filmupdates-style)", async () => {
    const pkg = filmupdatesPackage(
      "Official: CODA leads the awards conversation with Emilia Jones.",
    )
    prismaMock.arieOpportunity.findUnique.mockResolvedValue({
      id: "opp-fu",
      contentType: "original",
      originalStatus: "ELIGIBLE",
      originalScore: 77,
      originalScoreBreakdown: filmupdatesFlatBreakdown,
      conceptGenCount: 0,
      expiresAt: new Date(Date.now() + 36 * 3600_000),
      sourceHandle: "filmupdates",
      promptVersions: {},
    })
    prismaMock.arieContextPackage.findFirst.mockResolvedValue({ package: pkg })

    const res = await generateConceptsForOpportunity("opp-fu", { bypassGovernor: true })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.selected.id).toBe("c1")
    expect(generateConceptsMock).toHaveBeenCalled()
    const passedScore = generateConceptsMock.mock.calls[0][0].originalScore as OriginalScoreResult
    expect(passedScore.eligible).toBe(true)
    expect(passedScore.breakdown.data).toBe(8)
  })

  it("rejects IGNORED with not_eligible and does not call the writer", async () => {
    prismaMock.arieOpportunity.findUnique.mockResolvedValue({
      id: "opp-ign",
      contentType: "original",
      originalStatus: "IGNORED",
      originalScore: 77,
      originalScoreBreakdown: filmupdatesFlatBreakdown,
      conceptGenCount: 0,
      expiresAt: new Date(Date.now() + 36 * 3600_000),
      sourceHandle: "filmupdates",
    })
    prismaMock.arieContextPackage.findFirst.mockResolvedValue({
      package: filmupdatesPackage("CODA awards news"),
    })

    const res = await generateConceptsForOpportunity("opp-ign")
    expect(res).toEqual({ ok: false, reason: "not_eligible" })
    expect(generateConceptsMock).not.toHaveBeenCalled()
  })

  it("rejects a genuinely ineligible SCORED candidate", async () => {
    prismaMock.arieOpportunity.findUnique.mockResolvedValue({
      id: "opp-bad",
      contentType: "original",
      originalStatus: "SCORED",
      originalScore: 40,
      originalScoreBreakdown: ineligibleFlatBreakdown,
      conceptGenCount: 0,
      expiresAt: new Date(Date.now() + 36 * 3600_000),
      sourceHandle: "randomfan",
    })
    prismaMock.arieContextPackage.findFirst.mockResolvedValue({
      package: filmupdatesPackage("random note"),
    })

    const res = await generateConceptsForOpportunity("opp-bad")
    expect(res).toEqual({ ok: false, reason: "not_eligible" })
    expect(generateConceptsMock).not.toHaveBeenCalled()
  })

  it("Scout still rejects gossip on an otherwise ELIGIBLE row", async () => {
    prismaMock.arieOpportunity.findUnique.mockResolvedValue({
      id: "opp-gossip",
      contentType: "original",
      originalStatus: "ELIGIBLE",
      originalScore: 77,
      originalScoreBreakdown: filmupdatesFlatBreakdown,
      conceptGenCount: 0,
      expiresAt: new Date(Date.now() + 36 * 3600_000),
      sourceHandle: "filmupdates",
    })
    prismaMock.arieContextPackage.findFirst.mockResolvedValue({
      package: filmupdatesPackage(
        "Celebrity couple splits after heated argument at premiere — full drama inside.",
      ),
    })

    const res = await generateConceptsForOpportunity("opp-gossip")
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe("scout_gossip")
    expect(generateConceptsMock).not.toHaveBeenCalled()
    expect(prismaMock.arieOpportunity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ originalStatus: "IGNORED" }),
      }),
    )
  })

  it("blocks Busan/Focus Country poison: Focus (2015) package cannot generate concepts", async () => {
    const busan =
      "Busan's Asian Contents & Film Market Names Japan 2026 Focus Country for Producer Hub"
    const poisoned = filmupdatesPackage(busan)
    poisoned.movie = {
      id: "m-focus",
      title: "Focus",
      year: 2015,
      slug: "focus",
      director: "Glenn Ficarra",
      genre: "Crime",
      indexingCohort: 1,
    }
    poisoned.actor = {
      id: "a-will",
      name: "Will Smith",
      slug: "will-smith",
      knownFor: "Focus",
    }
    poisoned.actors = [{ id: "a-will", name: "Will Smith", slug: "will-smith", role: "primary" }]
    prismaMock.arieOpportunity.findUnique.mockResolvedValue({
      id: "opp-busan",
      contentType: "original",
      originalStatus: "ELIGIBLE",
      originalScore: 77,
      originalScoreBreakdown: filmupdatesFlatBreakdown,
      conceptGenCount: 0,
      expiresAt: new Date(Date.now() + 36 * 3600_000),
      sourceHandle: "filmupdates",
      promptVersions: {},
    })
    prismaMock.arieContextPackage.findFirst.mockResolvedValue({ package: poisoned })

    const res = await generateConceptsForOpportunity("opp-busan", { bypassGovernor: true })
    expect(res).toEqual({ ok: false, reason: "source_subject_mismatch" })
    expect(generateConceptsMock).not.toHaveBeenCalled()
  })

  it("still generates concepts for a real Animals trailer opportunity", async () => {
    const animalsText =
      "Ben Affleck and Kerry Washington star in the official trailer for Netflix's Animals"
    const pkg = filmupdatesPackage(animalsText)
    pkg.movie = {
      id: "m-animals",
      title: "Animals",
      year: 2026,
      slug: "animals",
      director: null,
      genre: null,
      indexingCohort: 1,
    }
    pkg.actor = {
      id: "a-affleck",
      name: "Ben Affleck",
      slug: "ben-affleck",
      knownFor: null,
    }
    pkg.actors = [{ id: "a-affleck", name: "Ben Affleck", slug: "ben-affleck", role: "primary" }]
    prismaMock.arieOpportunity.findUnique.mockResolvedValue({
      id: "opp-animals",
      contentType: "original",
      originalStatus: "ELIGIBLE",
      originalScore: 88,
      originalScoreBreakdown: filmupdatesFlatBreakdown,
      conceptGenCount: 0,
      expiresAt: new Date(Date.now() + 36 * 3600_000),
      sourceHandle: "thr",
      promptVersions: {},
    })
    prismaMock.arieContextPackage.findFirst.mockResolvedValue({ package: pkg })

    const res = await generateConceptsForOpportunity("opp-animals", { bypassGovernor: true })
    expect(res.ok).toBe(true)
    expect(generateConceptsMock).toHaveBeenCalled()
  })
})

describe("evaluateSourceSubjectMatch", () => {
  const busan =
    "Busan's Asian Contents & Film Market Names Japan 2026 Focus Country for Producer Hub"

  it("rejects Focus (2015) as the subject of the Busan source", () => {
    const r = evaluateSourceSubjectMatch({
      text: busan,
      package: {
        movie: {
          id: "m-focus",
          title: "Focus",
          year: 2015,
          slug: "focus",
          director: "Glenn Ficarra",
          genre: "Crime",
          indexingCohort: 1,
        },
        actor: {
          id: "a-will",
          name: "Will Smith",
          slug: "will-smith",
          knownFor: null,
        },
        actors: [],
        director: { name: "Richard Pearce", filmCount: 1, notableFilms: ["Film (1965)"] },
      },
    })
    expect(r).toEqual({ ok: false, reason: "source_subject_mismatch" })
  })

  it("accepts Animals when the source is the Netflix trailer", () => {
    const r = evaluateSourceSubjectMatch({
      text: "Ben Affleck and Kerry Washington star in the official trailer for Netflix's Animals",
      package: {
        movie: {
          id: "m-animals",
          title: "Animals",
          year: 2026,
          slug: "animals",
          director: null,
          genre: null,
          indexingCohort: 1,
        },
        actor: {
          id: "a-affleck",
          name: "Ben Affleck",
          slug: "ben-affleck",
          knownFor: null,
        },
        actors: [],
        director: null,
      },
    })
    expect(r).toEqual({ ok: true })
  })
})
