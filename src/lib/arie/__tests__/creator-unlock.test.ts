/**
 * Creator Unlock Sprint — scout exclusions, concept payload, intelligence ranking, groq retry.
 */
import { evaluateScoutExclusion } from "@/lib/arie/scout-exclusions"
import {
  deriveActorRatingPayload,
  isGenericNewsConcept,
  validateConceptPayloads,
} from "@/lib/arie/concept-payload"
import { buildEvidenceLayer } from "@/lib/arie/provenance"
import { isTransientInferenceFailure } from "@/lib/arie/groq"
import { computeIntelligenceScore, tierFromScore } from "@/lib/arie/intelligence"
import { scoreOriginalOpportunity } from "@/lib/arie/original-score"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"
import type { ContextPackage } from "@/lib/arie/types"
import type { OriginalConcept } from "@/lib/arie/original-types"
import { arieOriginalPublishEnabled, ariePublishEnabled } from "@/lib/arie/config"

const emptyEntities: ExtractedEntities = {
  actors: [],
  movies: [],
  directors: [],
  unresolved: [],
}

const tobeyEntities: ExtractedEntities = {
  actors: [{ id: "a-tobey", name: "Tobey Maguire", slug: "tobey", confidence: 95 }],
  movies: [],
  directors: [],
  unresolved: [],
}

const ruffaloEntities: ExtractedEntities = {
  actors: [{ id: "a-mark", name: "Mark Ruffalo", slug: "mark-ruffalo", confidence: 95 }],
  movies: [],
  directors: [],
  unresolved: [],
}

function richPkg(): ContextPackage {
  return {
    package_id: "p",
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
    movie: null,
    actor: { id: "a1", name: "Florence Pugh", slug: "florence-pugh", knownFor: null },
    actors: [{ id: "a1", name: "Florence Pugh", slug: "florence-pugh", role: "primary" }],
    director: { name: "Christopher Nolan", filmCount: 12, notableFilms: [] },
    radar: {
      actorId: "a1",
      movieId: "m1",
      actorName: "Florence Pugh",
      movieTitle: "Midsommar",
      dimensions: { intensity: 8, range: 7, charisma: 9, technique: 8, presence: 8 },
      strongest: ["intensity"],
      weakest: ["range"],
      seededAggregate: 8.1,
    },
    topPerformances: [
      {
        actorId: "a1",
        movieId: "m1",
        actorName: "Florence Pugh",
        movieTitle: "Midsommar",
        movieYear: 2019,
        character: null,
        seededAggregate: 8.1,
        ratingCount: 50,
        href: null,
      },
    ],
    relatedPerformances: [],
    communityRating: { actorId: "a1", movieId: "m1", ratingCount: 120, avg10: 7.8 },
    similarActors: [],
    links: [],
    facts: [
      {
        fact_id: "f1",
        type: "aggregate_score",
        text: "Florence Pugh aggregate 8.1",
        value: 8.1,
        entity_refs: ["a1"],
        source: "actorrating_db",
        as_of: new Date().toISOString(),
      },
    ],
    claims: [],
    sourceProvenance: null,
    evidence: null,
    factualConfidence: null,
    writerMode: null,
    brand: { constitution_version: "1.1", constitution_path: "x" },
    unresolved: [],
    graph: { nodes: [], edges: [] },
    budgets: { max_tokens_for_writer: 700, max_claims: 4 },
    coverage: {
      slots: {
        actor: true,
        movie: false,
        director: true,
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

describe("Scout hard NO rules", () => {
  it("excludes celebrity gossip", () => {
    const r = evaluateScoutExclusion({
      text: "Celebrity couple splits after heated argument at premiere — full drama inside.",
      authorHandle: "boinkbuzz",
    })
    expect(r.excluded).toBe(true)
    expect(r.reason).toBe("gossip_celebrity_drama")
  })

  it("excludes should_ignore tags", () => {
    const r = evaluateScoutExclusion({
      text: "Some film news about Spider-Man",
      tags: ["should_ignore", "gossip"],
    })
    expect(r.excluded).toBe(true)
    expect(r.reason).toBe("should_ignore_tag")
  })

  it("excludes unknown-source rumor", () => {
    const r = evaluateScoutExclusion({
      text: "I heard Tom Holland is quitting Spider-Man forever after Secret Wars.",
      authorHandle: "randomfilmfan99",
      tags: ["unknown_source"],
    })
    expect(r.excluded).toBe(true)
    expect(r.reason).toBe("unknown_source_rumor")
  })

  it("excludes generic AI/media without acting angle", () => {
    const r = evaluateScoutExclusion({
      text: "Roku has started a 24/7 channel that plays AI slop movies.",
      authorHandle: "discussingfilm",
    })
    expect(r.excluded).toBe(true)
    expect(r.reason).toBe("ai_media_no_acting_angle")
  })

  it("excludes music promo without film angle", () => {
    const r = evaluateScoutExclusion({
      text: "New single out now — stream on Spotify!",
      authorHandle: "variety",
    })
    expect(r.excluded).toBe(true)
    expect(r.reason).toBe("music_promo_no_film_angle")
  })

  it("excludes appearance bait without substantive angle", () => {
    const r = evaluateScoutExclusion({
      text: "Zendaya looks unreal at the Paris premiere last night.",
      authorHandle: "chaoscrave",
      entities: {
        actors: [{ id: "a-z", name: "Zendaya", slug: "zendaya", confidence: 90 }],
        movies: [],
        directors: [],
        unresolved: [],
      },
    })
    expect(r.excluded).toBe(true)
    expect(r.reason).toBe("appearance_bait")
  })

  it("allows legitimate casting news", () => {
    const r = evaluateScoutExclusion({
      text: "EXCLUSIVE: Florence Pugh in talks to join Christopher Nolan's next film.",
      authorHandle: "deadline",
      entities: {
        actors: [{ id: "a-f", name: "Florence Pugh", slug: "fp", confidence: 95 }],
        movies: [],
        directors: [{ name: "Christopher Nolan", confidence: 90 }],
        unresolved: [],
      },
      dataScore: 6,
    })
    expect(r.excluded).toBe(false)
  })

  it("scoreOriginalOpportunity marks gossip ineligible via scout", () => {
    const score = scoreOriginalOpportunity({
      text: "Fans notice Zendaya refused to hold hands until she met Tom Holland.",
      authorHandle: "boinkbuzz",
      tags: ["should_ignore", "gossip"],
      entities: emptyEntities,
    })
    expect(score.eligible).toBe(false)
    expect(score.reasonCodes.some((c) => c.startsWith("scout_"))).toBe(true)
  })
})

describe("Aggregator provenance regression", () => {
  const TOBEY_TEXT =
    "🚨 CONFIRMED - Tobey Maguire will return as Spider-Man in AVENGERS: DOOMSDAY. Tobey will don the Iconic Iron Spider Suit."

  it("Tobey/BoinkBuzz — high opp path stays REPORTED_EVENT with low FC", () => {
    const { evidence, source } = buildEvidenceLayer({
      text: TOBEY_TEXT,
      authorHandle: "boinkbuzz",
      entities: tobeyEntities,
      facts: [],
    })
    expect(source.reliabilityClass).toBe("AGGREGATOR")
    expect(source.distributionPriority).toBe("HIGH")
    expect(evidence.writerMode).toBe("REPORTED_EVENT")
    expect(evidence.factualConfidence).toBeLessThanOrEqual(72)
    const costume = [...evidence.uncertain, ...evidence.contradicted].find(
      (c) => c.predicate === "costume_claim",
    )
    expect(costume).toBeTruthy()
    expect(costume?.status === "UNVERIFIED" || costume?.status === "CONTRADICTED").toBe(true)
  })

  it("aggregator franchise-exit language does not become VERIFIED_EVENT", () => {
    const { evidence } = buildEvidenceLayer({
      text: "Mark Ruffalo reportedly confirms Avengers: Doomsday will be his final time playing Hulk.",
      authorHandle: "chaoscrave_",
      entities: ruffaloEntities,
      facts: [],
    })
    expect(evidence.writerMode).toBe("REPORTED_EVENT")
    expect(evidence.factualConfidence).toBeLessThanOrEqual(72)
  })

  it("deadline in-talks casting stays TRADE + REPORTED_EVENT", () => {
    const { evidence, source } = buildEvidenceLayer({
      text: "EXCLUSIVE: Florence Pugh in talks to join Christopher Nolan's next film in a major supporting role.",
      authorHandle: "deadline",
      entities: {
        actors: [{ id: "a-fp", name: "Florence Pugh", slug: "fp", confidence: 95 }],
        movies: [],
        directors: [{ name: "Christopher Nolan", confidence: 90 }],
        unresolved: [],
      },
      facts: [],
    })
    expect(source.reliabilityClass).toBe("TRADE")
    expect(evidence.writerMode).toBe("REPORTED_EVENT")
    expect(evidence.factualConfidence).toBeGreaterThan(40)
  })
})

describe("ActorRating-native concept payload", () => {
  const pkg = richPkg()

  it("rejects generic news concept without payload", () => {
    const generic: OriginalConcept = {
      id: "c1",
      format: "DISCUSSION_DEBATE",
      hook: "Florence Pugh is reportedly joining Nolan's next film. Thoughts?",
      angle: "Casting news",
      actorRatingAdvantage: "Trending",
      discussionQuestion: "What do you think?",
      dataUsed: [],
      visualPotential: "none",
      estimatedStrength: 50,
      riskFlags: [],
    }
    const meta = deriveActorRatingPayload(generic, pkg)
    expect(meta.actorRatingPayloadPresent).toBe(false)
    expect(isGenericNewsConcept(generic, meta)).toBe(true)
  })

  it("accepts comparison concept with ActorRating payload", () => {
    const native: OriginalConcept = {
      id: "c2",
      format: "COMPARISON",
      hook: "Florence Pugh × Nolan: how does Midsommar stack up against past Nolan leads?",
      angle: "Compare Pugh's strongest dramatic performances with Nolan casting patterns",
      actorRatingAdvantage: "ActorRating has Pugh's Midsommar aggregate and Nolan collaborator scores",
      discussionQuestion: "Which Pugh performance would translate best to a Nolan film?",
      dataUsed: ["Midsommar aggregate 8.1", "Nolan collaborator pattern"],
      visualPotential: "comparison",
      estimatedStrength: 85,
      riskFlags: [],
    }
    const { concepts, rejected } = validateConceptPayloads([native], pkg)
    expect(rejected).toHaveLength(0)
    expect(concepts[0]?.actorRatingPayloadPresent).toBe(true)
    expect(concepts[0]?.payloadType).toBe("comparison")
  })
})

describe("Groq reliability helpers", () => {
  it("treats 429 as transient", () => {
    expect(isTransientInferenceFailure("groq_http_429")).toBe(true)
    expect(isTransientInferenceFailure("missing_api_key")).toBe(false)
  })
})

describe("Daily Intelligence ranking", () => {
  it("ranks draft+QA candidates higher", () => {
    const base = computeIntelligenceScore({ originalScore: 80, distributionPriority: "HIGH" })
    const withDraft = computeIntelligenceScore({
      originalScore: 80,
      distributionPriority: "HIGH",
      hasDraft: true,
      qaPassed: true,
      payloadPresent: true,
    })
    expect(withDraft).toBeGreaterThan(base)
    expect(tierFromScore(withDraft)).toBe("exceptional")
  })
})

describe("Publish safety", () => {
  it("publish flags remain off by default", () => {
    expect(ariePublishEnabled()).toBe(false)
    expect(arieOriginalPublishEnabled()).toBe(false)
  })
})
