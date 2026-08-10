import {
  buildOriginalPrediction,
  comparePredictionToActual,
  hashOriginalContent,
  mapConceptFormatToTaxonomy,
  ORIGINAL_PREDICTION_VERSION,
} from "@/lib/arie/original-prediction"
import {
  ARIE_UTM_CAMPAIGN,
  originalAttributionCode,
  withArieOriginalUtm,
} from "@/lib/arie/original-attribution"
import { checkOriginalConstitution } from "@/lib/arie/original-constitution"
import {
  parseConceptsWithZod,
  parseDraftWithZod,
  parseSemanticQaWithZod,
} from "@/lib/arie/original-schemas"
import { arieOriginalPublishEnabled, ariePublishEnabled } from "@/lib/arie/config"
import { METRIC_WINDOWS } from "@/lib/arie/original-metrics"
import { originalExpiresAt } from "@/lib/arie/original-score"

describe("original prediction heuristic", () => {
  const base = {
    score: 80,
    breakdown: {
      heat: 24,
      relevance: 18,
      visual: 16,
      discussion: 12,
      data: 8,
      timing: 5,
    },
  }

  it("produces versioned score + tier + buckets", () => {
    const p = buildOriginalPrediction({
      originalScore: base,
      concept: { format: "COMPARISON", totalScore: 88, estimatedStrength: 88 },
      contentFormat: "comparison",
      priorityAuthor: true,
      coveragePercent: 70,
    })
    expect(p.predictionModelVersion).toBe(ORIGINAL_PREDICTION_VERSION)
    expect(p.predictedScore).toBeGreaterThanOrEqual(0)
    expect(p.predictedScore).toBeLessThanOrEqual(100)
    expect(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]).toContain(p.predictedTier)
    expect(p.predictedImpressionsBucket).toMatch(/k|\+|</)
    expect(p.predictionFactors.heat).toBeGreaterThan(0)
  })

  it("keeps version stable string for historical rows", () => {
    expect(ORIGINAL_PREDICTION_VERSION).toMatch(/^original-prediction@/)
  })

  it("maps concept formats to taxonomy", () => {
    expect(mapConceptFormatToTaxonomy("COMPARISON")).toBe("comparison")
    expect(mapConceptFormatToTaxonomy("RADAR_VISUAL")).toBe("data_radar")
    expect(mapConceptFormatToTaxonomy("DISCUSSION_DEBATE")).toBe("question_debate")
  })

  it("compares prediction vs actual without fabricating pending metrics", () => {
    const pending = comparePredictionToActual({
      predictedScore: 80,
      impressions: null,
    })
    expect(pending.status).toBe("pending")
    expect(pending.label).toBe("Metrics pending")

    const beat = comparePredictionToActual({
      predictedScore: 60,
      impressions: 200_000,
      likes: 5000,
      replies: 800,
    })
    expect(beat.actualNormalizedScore).not.toBeNull()
    expect(beat.delta).not.toBeNull()
  })
})

describe("original attribution", () => {
  it("uses stable opportunity id as utm_content", () => {
    const id = "opp_abc123"
    expect(originalAttributionCode(id)).toBe(id)
    const url = withArieOriginalUtm({
      href: "https://actorrating.com/actors/tobey-maguire",
      opportunityId: id,
    })
    expect(url).toContain("utm_source=x")
    expect(url).toContain("utm_medium=social")
    expect(url).toContain(`utm_campaign=${ARIE_UTM_CAMPAIGN}`)
    expect(url).toContain(`utm_content=${id}`)
  })
})

describe("constitution + content hash", () => {
  it("rejects silence tokens and em dashes", () => {
    expect(checkOriginalConstitution("[NO REPLY]").passed).toBe(false)
    expect(checkOriginalConstitution("Tobey — back").passed).toBe(false)
    expect(
      checkOriginalConstitution(
        "Tobey's Spider-Man sits at 8.2 on ActorRating. Who are you taking?",
      ).passed,
    ).toBe(true)
  })

  it("hashes normalized draft text for dedupe", () => {
    expect(hashOriginalContent("Hello World")).toBe(hashOriginalContent("hello   world"))
  })
})

describe("zod structured outputs", () => {
  it("validates concepts and rejects empty", () => {
    const bad = parseConceptsWithZod({ concepts: [] })
    expect(bad.ok).toBe(false)
    const ok = parseConceptsWithZod({
      concepts: [
        {
          format: "RANKING",
          hook: "Rank these",
          angle: "angle",
          actorRatingAdvantage: "scores",
          discussionQuestion: "Which?",
          dataUsed: ["8.2"],
          visualPotential: "list",
          estimatedStrength: 70,
        },
      ],
    })
    expect(ok.ok).toBe(true)
  })

  it("validates draft + qa schemas", () => {
    expect(parseDraftWithZod({ text: "hi" }).ok).toBe(true)
    expect(parseDraftWithZod({}).ok).toBe(false)
    expect(
      parseSemanticQaWithZod({
        passed: true,
        scores: { factualAccuracy: 5, hallucinationRisk: 1 },
      }).ok,
    ).toBe(true)
  })
})

describe("publish flags remain off by default", () => {
  const prevPub = process.env.ARIE_PUBLISH_ENABLED
  const prevOrig = process.env.ARIE_ORIGINAL_PUBLISH_ENABLED
  afterEach(() => {
    if (prevPub === undefined) delete process.env.ARIE_PUBLISH_ENABLED
    else process.env.ARIE_PUBLISH_ENABLED = prevPub
    if (prevOrig === undefined) delete process.env.ARIE_ORIGINAL_PUBLISH_ENABLED
    else process.env.ARIE_ORIGINAL_PUBLISH_ENABLED = prevOrig
  })

  it("both publish flags default false", () => {
    delete process.env.ARIE_PUBLISH_ENABLED
    delete process.env.ARIE_ORIGINAL_PUBLISH_ENABLED
    expect(ariePublishEnabled()).toBe(false)
    expect(arieOriginalPublishEnabled()).toBe(false)
  })
})

describe("metric windows + expiration still defined", () => {
  it("defines trajectory windows", () => {
    expect(METRIC_WINDOWS).toEqual(["1h", "6h", "24h", "72h", "7d"])
  })

  it("expires casting sooner than ranking debates", () => {
    const t = new Date("2026-08-10T00:00:00Z")
    expect(originalExpiresAt("casting", t).getTime()).toBeLessThan(
      originalExpiresAt("ranking_debate", t).getTime(),
    )
  })
})
