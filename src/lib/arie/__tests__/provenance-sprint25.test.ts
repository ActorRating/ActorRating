/**
 * Sprint 2.5 — provenance, claim status, QA grounding, Tobey/BoinkBuzz regression.
 */
import {
  buildEvidenceLayer,
  classifyDistributionPriority,
  classifySourceReliability,
  findUnsupportedAssertions,
  draftHasAttribution,
} from "@/lib/arie/provenance"
import { buildVisualSpec } from "@/lib/arie/original-visual"
import { runDeterministicOriginalQa } from "@/lib/arie/original-qa"
import { collectAllowedNumbers, findInventedNumbers } from "@/lib/arie/original-writer"
import { scoreOriginalOpportunity } from "@/lib/arie/original-score"
import type { ContextPackage } from "@/lib/arie/types"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"
import type { OriginalConcept, OriginalDraft } from "@/lib/arie/original-types"
import { ORIGINAL_ELIGIBLE_MIN } from "@/lib/arie/original-types"

const TOBEY_BOINKBUZZ_TEXT =
  "🚨 CONFIRMED - Tobey Maguire will return as the Friendly Neighborhood Spider-Man in AVENGERS: DOOMSDAY & SECRET WARS. Tobey will don the Iconic Iron Spider Suit..."

const tobeyEntities: ExtractedEntities = {
  actors: [
    {
      id: "a-tobey",
      name: "Tobey Maguire",
      slug: "tobey-maguire",
      confidence: 95,
    },
  ],
  movies: [],
  directors: [],
  unresolved: [],
}

const now = new Date().toISOString()

const arFacts: ContextPackage["facts"] = [
  {
    fact_id: "perf:agg:spiderman:tobey",
    type: "aggregate_score",
    text: "Tobey Maguire in Spider-Man (2002): aggregate 7.3/10 on ActorRating",
    value: 7.3,
    entity_refs: ["actor:a-tobey", "movie:m-spiderman"],
    source: "actorrating_db",
    as_of: now,
  },
]

function baseConcept(over: Partial<OriginalConcept> = {}): OriginalConcept {
  return {
    id: "c1",
    format: "DISCUSSION_DEBATE",
    hook: "Tobey Maguire's Spider-Man legacy on ActorRating",
    angle: "Use confirmed AR performances",
    actorRatingAdvantage: "ActorRating has Tobey's Spider-Man aggregate scores",
    discussionQuestion: "Which Tobey Spider-Man performance ranks highest for you?",
    dataUsed: ["Tobey Maguire Spider-Man aggregate"],
    visualPotential: "none",
    estimatedStrength: 80,
    riskFlags: [],
    ...over,
  }
}

function baseDraft(text: string, pkg: ContextPackage): OriginalDraft {
  return {
    text,
    visual: buildVisualSpec({ concept: baseConcept(), package: pkg }),
    entities: [{ type: "actor", name: "Tobey Maguire" }],
    links: [],
    sourceReferences: [],
    confidence: 70,
    claims: [],
  }
}

function pkgFromEvidence(input: {
  text: string
  handle: string
  corrections?: string[]
  corroborations?: Array<{ handle: string; text: string; contradicts?: boolean }>
  facts?: ContextPackage["facts"]
  entities?: ExtractedEntities
}): ContextPackage {
  const entities = input.entities ?? tobeyEntities
  const facts = input.facts ?? arFacts
  const { source, claims, evidence } = buildEvidenceLayer({
    text: input.text,
    authorHandle: input.handle,
    entities,
    facts,
    corrections: input.corrections,
    corroborations: input.corroborations,
  })
  return {
    package_id: "p",
    created_at: now,
    builder_version: "test",
    event: {
      text: input.text,
      platform: "X",
      author_handle: input.handle,
    },
    opportunity: {
      score: 85,
      breakdown: {
        relevance: 80,
        virality: 90,
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
    actor: {
      id: "a-tobey",
      name: "Tobey Maguire",
      slug: "tobey-maguire",
      knownFor: null,
    },
    actors: [{ id: "a-tobey", name: "Tobey Maguire", slug: "tobey-maguire", role: "primary" }],
    director: null,
    radar: null,
    topPerformances: [],
    communityRating: null,
    relatedPerformances: [
      {
        actorName: "Tobey Maguire",
        movieTitle: "Spider-Man",
        movieYear: 2002,
        href: null,
        note: "prior",
      },
      {
        actorName: "Andrew Garfield",
        movieTitle: "The Amazing Spider-Man",
        movieYear: 2012,
        href: null,
        note: "prior",
      },
    ],
    currentTrend: { label: "casting_news", note: "reported" },
    similarActors: [],
    links: [],
    facts,
    claims,
    sourceProvenance: source,
    evidence,
    factualConfidence: evidence.factualConfidence,
    writerMode: evidence.writerMode,
    brand: { constitution_version: "1.1", constitution_path: "docs/arie/BRAND_CONSTITUTION.md" },
    unresolved: [],
    graph: { nodes: [], edges: [] },
    budgets: { max_tokens_for_writer: 700, max_claims: 4 },
    coverage: {
      slots: {
        actor: true,
        movie: false,
        director: false,
        radar: false,
        comparisons: true,
        awards: false,
        community: false,
      },
      present: 2,
      total: 7,
      percent: 29,
    },
  }
}

describe("Sprint 2.5 provenance & claim status", () => {
  it("TEST 1 — source says X, no corroboration → REPORTED; cannot state as verified", () => {
    const { claims, evidence } = buildEvidenceLayer({
      text: "Tobey Maguire will return as Spider-Man in Avengers Doomsday",
      authorHandle: "boinkbuzz",
      entities: tobeyEntities,
      facts: arFacts,
    })
    const casting = claims.find((c) => c.predicate === "reported_return" || c.predicate === "reported_casting")
    expect(casting?.status).toBe("REPORTED")
    expect(casting?.requiresAttribution).toBe(true)
    expect(evidence.writerMode).toBe("REPORTED_EVENT")

    const bad = findUnsupportedAssertions(
      "Tobey Maguire will return as Spider-Man in Avengers Doomsday — rate him on ActorRating.",
      claims,
    )
    expect(bad.some((i) => i.type === "UNVERIFIED_ASSERTION")).toBe(true)
  })

  it("TEST 2 — trusted corroboration upgrades casting to VERIFIED", () => {
    const { claims } = buildEvidenceLayer({
      text: "Tobey Maguire will return as Spider-Man in Avengers Doomsday",
      authorHandle: "boinkbuzz",
      entities: tobeyEntities,
      facts: arFacts,
      corroborations: [
        {
          handle: "deadline",
          text: "Tobey Maguire will return as Spider-Man in Avengers: Doomsday",
        },
      ],
    })
    const casting = claims.find((c) => c.predicate === "reported_return" || c.predicate === "reported_casting")
    expect(casting?.status).toBe("VERIFIED")
    expect(casting?.requiresAttribution).toBe(false)
    expect(casting?.corroborationCount).toBeGreaterThan(0)
  })

  it("TEST 3 — trusted contradiction → CONTRADICTED", () => {
    const { claims } = buildEvidenceLayer({
      text: "Tobey Maguire will return as Spider-Man in Avengers Doomsday",
      authorHandle: "boinkbuzz",
      entities: tobeyEntities,
      facts: arFacts,
      corroborations: [
        {
          handle: "deadline",
          text: "Tobey Maguire will not return as Spider-Man",
          contradicts: true,
        },
      ],
    })
    const casting = claims.find((c) => c.predicate === "reported_return" || c.predicate === "reported_casting")
    expect(casting?.status).toBe("CONTRADICTED")
  })

  it("TEST 4 — draft states reported claim as fact → QA FAIL", () => {
    const pkg = pkgFromEvidence({ text: TOBEY_BOINKBUZZ_TEXT, handle: "boinkbuzz" })
    const qa = runDeterministicOriginalQa({
      draft: baseDraft(
        "Tobey Maguire will return as Spider-Man in Avengers Doomsday. How does that compare on ActorRating?",
        pkg,
      ),
      concept: baseConcept(),
      package: pkg,
    })
    expect(qa.passed).toBe(false)
    expect(qa.issues.some((i) => i.type === "UNVERIFIED_ASSERTION")).toBe(true)
  })

  it("TEST 5 — attributed reported claim → QA PASS (when otherwise grounded)", () => {
    const pkg = pkgFromEvidence({ text: TOBEY_BOINKBUZZ_TEXT, handle: "boinkbuzz" })
    const text =
      "BoinkBuzz is reporting Tobey Maguire's return. If it happens, how would you rate his next Spider-Man performance on ActorRating vs his 7.3 aggregate?"
    const qa = runDeterministicOriginalQa({
      draft: baseDraft(text, pkg),
      concept: baseConcept(),
      package: pkg,
    })
    expect(draftHasAttribution(text)).toBe(true)
    expect(qa.passed).toBe(true)
  })

  it("TEST 6 — ActorRating score in context, draft uses 7.3 → PASS", () => {
    const pkg = pkgFromEvidence({ text: TOBEY_BOINKBUZZ_TEXT, handle: "boinkbuzz" })
    const allowed = collectAllowedNumbers(pkg)
    expect(allowed).toContain(7.3)
    const invented = findInventedNumbers(
      "Tobey Maguire's Spider-Man scores 7.3/10 on ActorRating — still your favorite?",
      allowed,
    )
    expect(invented).toEqual([])
  })

  it("TEST 7 — null score invent 7.3 → FAIL", () => {
    const pkg = pkgFromEvidence({
      text: "Would you want Tobey Maguire back as Spider-Man?",
      handle: "boinkbuzz",
      facts: [],
    })
    const allowed = collectAllowedNumbers(pkg)
    const invented = findInventedNumbers(
      "Tobey Maguire averages 7.3 on ActorRating — agree?",
      allowed,
    )
    expect(invented).toContain("7.3")
    const qa = runDeterministicOriginalQa({
      draft: baseDraft("Tobey Maguire averages 7.3 on ActorRating — agree?", pkg),
      concept: baseConcept(),
      package: pkg,
    })
    expect(qa.passed).toBe(false)
    expect(qa.issues.some((i) => i.type === "FABRICATED_NUMBER")).toBe(true)
  })

  it("TEST 8 — visual comparison with null values → eligible=false missing_numeric_data", () => {
    const pkg = pkgFromEvidence({ text: TOBEY_BOINKBUZZ_TEXT, handle: "boinkbuzz" })
    const visual = buildVisualSpec({
      concept: baseConcept({ format: "COMPARISON", visualPotential: "comparison chart" }),
      package: pkg,
    })
    expect(visual.eligible).toBe(false)
    expect(visual.reason).toBe("missing_numeric_data")
  })

  it("TEST 9 — high opportunity + low factual confidence still content-eligible", () => {
    const pkg = pkgFromEvidence({ text: TOBEY_BOINKBUZZ_TEXT, handle: "boinkbuzz" })
    expect(pkg.factualConfidence!).toBeLessThan(70)
    expect(pkg.writerMode).toBe("REPORTED_EVENT")

    const scored = scoreOriginalOpportunity({
      text: TOBEY_BOINKBUZZ_TEXT,
      authorHandle: "boinkbuzz",
      entities: tobeyEntities,
      context: pkg,
      ageMinutes: 30,
    })
    // Opportunity remains independent of factual confidence
    expect(scored.score).toBeGreaterThanOrEqual(ORIGINAL_ELIGIBLE_MIN)
    expect(scored.eligible).toBe(true)
  })

  it("TEST 10 — BoinkBuzz high distribution + AGGREGATOR reliability (separate)", () => {
    expect(classifySourceReliability("boinkbuzz")).toBe("AGGREGATOR")
    expect(classifyDistributionPriority("boinkbuzz")).toBe("HIGH")
    const { source } = buildEvidenceLayer({
      text: TOBEY_BOINKBUZZ_TEXT,
      authorHandle: "boinkbuzz",
      entities: tobeyEntities,
      facts: arFacts,
    })
    expect(source.distributionPriority).toBe("HIGH")
    expect(source.reliabilityClass).toBe("AGGREGATOR")
  })

  it("TEST 11 — unknown source reliability UNKNOWN; opportunity not discarded", () => {
    expect(classifySourceReliability("randomfilmfan99")).toBe("UNKNOWN")
    const pkg = pkgFromEvidence({
      text: "Tobey Maguire will return as Spider-Man in Doomsday",
      handle: "randomfilmfan99",
    })
    expect(pkg.sourceProvenance?.reliabilityClass).toBe("UNKNOWN")
    const scored = scoreOriginalOpportunity({
      text: "Tobey Maguire will return as Spider-Man in Doomsday",
      authorHandle: "randomfilmfan99",
      entities: tobeyEntities,
      context: pkg,
      ageMinutes: 20,
    })
    // May or may not meet eligibility threshold, but must not be force-killed for UNKNOWN reliability
    expect(scored.reasonCodes.join(" ")).not.toMatch(/unknown_reliability_discard/i)
  })

  it("TEST 12 — later correction surfaces and Iron Spider → CONTRADICTED", () => {
    const { claims, evidence } = buildEvidenceLayer({
      text: TOBEY_BOINKBUZZ_TEXT,
      authorHandle: "boinkbuzz",
      entities: tobeyEntities,
      facts: arFacts,
      corrections: [
        "There are no credible sources saying Tobey Maguire will wear the Iconic Iron Spider Suit.",
      ],
    })
    const costume = claims.find((c) => c.predicate === "costume_claim")
    expect(costume?.status).toBe("CONTRADICTED")
    expect(evidence.contradicted.some((c) => c.predicate === "costume_claim")).toBe(true)
    expect(claims.some((c) => c.predicate === "later_correction")).toBe(true)
  })

  it("TEST 13 — movie title only in inbound source → REPORTED, not independently verified", () => {
    const { claims } = buildEvidenceLayer({
      text: TOBEY_BOINKBUZZ_TEXT,
      authorHandle: "boinkbuzz",
      entities: tobeyEntities,
      facts: arFacts,
    })
    const titles = claims.filter((c) => c.predicate === "movie_mentioned_in_source")
    expect(titles.length).toBeGreaterThan(0)
    expect(titles.every((c) => c.status === "REPORTED")).toBe(true)
  })

  it("TEST 14 — unsupported actor/movie relationship framed as fact → QA FAIL", () => {
    const pkg = pkgFromEvidence({ text: TOBEY_BOINKBUZZ_TEXT, handle: "boinkbuzz" })
    const qa = runDeterministicOriginalQa({
      draft: baseDraft(
        "Tobey Maguire returns as Spider-Man in AVENGERS: DOOMSDAY on ActorRating's confirmed cast list.",
        pkg,
      ),
      concept: baseConcept(),
      package: pkg,
    })
    expect(qa.passed).toBe(false)
  })

  it("TEST 15 — draft based only on confirmed ActorRating data → PASS", () => {
    const pkg = pkgFromEvidence({ text: TOBEY_BOINKBUZZ_TEXT, handle: "boinkbuzz" })
    const text =
      "Tobey Maguire's Spider-Man still scores 7.3 aggregate on ActorRating. Which of his three Spider-Man films is your craft favorite?"
    // Note: "three" is 1-10 ordinal allowance; 7.3 allowed
    const qa = runDeterministicOriginalQa({
      draft: baseDraft(text, pkg),
      concept: baseConcept({
        hook: "Tobey Maguire's Spider-Man legacy",
        groundedInUncertainClaim: false,
        requiresAttribution: false,
      }),
      package: pkg,
    })
    expect(qa.passed).toBe(true)
  })
})

describe("Sprint 2.5 Tobey / BoinkBuzz regression", () => {
  it("never asserts Iron Spider as confirmed; may keep high-opportunity framing", () => {
    const pkg = pkgFromEvidence({
      text: TOBEY_BOINKBUZZ_TEXT,
      handle: "boinkbuzz",
      corrections: [
        "There are no credible sources saying Tobey Maguire will wear the Iconic Iron Spider Suit.",
      ],
    })

    expect(pkg.sourceProvenance?.reliabilityClass).toBe("AGGREGATOR")
    expect(pkg.sourceProvenance?.distributionPriority).toBe("HIGH")
    expect(pkg.writerMode).toMatch(/REPORTED_EVENT|DISCUSSION/)

    const costume = pkg.claims.find((c) => c.predicate === "costume_claim")
    expect(costume?.status).toBe("CONTRADICTED")

    const ironAsFact = runDeterministicOriginalQa({
      draft: baseDraft(
        "Tobey Maguire will don the Iron Spider Suit in Avengers Doomsday — rate the look on ActorRating.",
        pkg,
      ),
      concept: baseConcept(),
      package: pkg,
    })
    expect(ironAsFact.passed).toBe(false)
    expect(
      ironAsFact.issues.some(
        (i) => i.type === "CONTRADICTED_ASSERTION" || i.type === "UNVERIFIED_ASSERTION",
      ),
    ).toBe(true)

    const good = runDeterministicOriginalQa({
      draft: baseDraft(
        "BoinkBuzz is reporting Tobey Maguire's return. If it happens, how would you rate his next Spider-Man performance vs his 7.3 ActorRating aggregate?",
        pkg,
      ),
      concept: baseConcept(),
      package: pkg,
    })
    expect(good.passed).toBe(true)
  })
})
