import { createHash } from "crypto"
import type { OriginalConcept, OriginalScoreResult } from "@/lib/arie/original-types"

/** Bump when heuristic weights change — historical rows keep their version. */
export const ORIGINAL_PREDICTION_VERSION = "original-prediction@v1.0"

export type PredictedTier = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH"

export type ImpressionBucket =
  | "<1k"
  | "1k-5k"
  | "5k-25k"
  | "25k-100k"
  | "100k-500k"
  | "500k+"

export type OriginalPredictionSnapshot = {
  predictedScore: number
  predictedTier: PredictedTier
  predictedImpressionsBucket: ImpressionBucket
  predictedEngagementRateBucket: string
  predictedProfileVisitsBucket: string
  predictedActorRatingClicksBucket: string
  predictedFormat: string
  predictedConceptScore: number | null
  predictedOpportunityScore: number
  predictionModelVersion: string
  predictionCreatedAt: string
  predictionFactors: {
    heat: number
    relevance: number
    visualPotential: number
    discussionPotential: number
    dataAdvantage: number
    timing: number
    conceptStrength: number
    entityFamiliarity: number
    prioritySourceBoost: number
  }
  /**
   * Sprint 2.5 — expose dimensions for future measurement (not used in score).
   * Opportunity vs factual confidence remain separate.
   */
  measurementDimensions?: {
    opportunityScore: number
    factualConfidence: number | null
    sourceDistributionPriority: string | null
    sourceReliabilityClass: string | null
    conceptFormat: string | null
    writerVersion: string | null
    qaOutcome: string | null
    humanApprovalOutcome: string | null
    publishedOutcome: string | null
  }
  notes: string
}

/**
 * Deterministic / transparent heuristic — NOT an ML model.
 * Labeled Opportunity Prediction for pre-publish comparison only.
 */
export function buildOriginalPrediction(input: {
  originalScore: OriginalScoreResult | {
    score: number
    breakdown: {
      heat: number
      relevance: number
      visual: number
      discussion: number
      data: number
      timing: number
    }
  }
  concept?: Pick<OriginalConcept, "format" | "totalScore" | "estimatedStrength"> | null
  contentFormat: string
  priorityAuthor?: boolean
  coveragePercent?: number
  /** Optional Sprint 2.5 measurement surfaces — not used in predicted score. */
  measurement?: {
    factualConfidence?: number | null
    sourceDistributionPriority?: string | null
    sourceReliabilityClass?: string | null
    writerVersion?: string | null
    qaOutcome?: string | null
    humanApprovalOutcome?: string | null
    publishedOutcome?: string | null
  }
}): OriginalPredictionSnapshot {
  const b = input.originalScore.breakdown
  const conceptStrength = clamp(
    input.concept?.totalScore ??
      input.concept?.estimatedStrength ??
      Math.round(input.originalScore.score * 0.85),
  )
  const entityFamiliarity = clamp(
    Math.round(
      (b.relevance / 20) * 55 +
        (typeof input.coveragePercent === "number" ? input.coveragePercent * 0.35 : 20),
    ),
  )
  const prioritySourceBoost = input.priorityAuthor ? 12 : 0

  // Normalize sub-scores to 0–100 for factors display
  const factors = {
    heat: clamp(Math.round((b.heat / 30) * 100)),
    relevance: clamp(Math.round((b.relevance / 20) * 100)),
    visualPotential: clamp(Math.round((b.visual / 20) * 100)),
    discussionPotential: clamp(Math.round((b.discussion / 15) * 100)),
    dataAdvantage: clamp(Math.round((b.data / 10) * 100)),
    timing: clamp(Math.round((b.timing / 5) * 100)),
    conceptStrength,
    entityFamiliarity,
    prioritySourceBoost,
  }

  const predictedScore = clamp(
    Math.round(
      0.28 * input.originalScore.score +
        0.22 * conceptStrength +
        0.12 * factors.heat +
        0.1 * factors.discussionPotential +
        0.1 * factors.visualPotential +
        0.08 * factors.dataAdvantage +
        0.05 * factors.timing +
        0.05 * entityFamiliarity +
        prioritySourceBoost * 0.5,
    ),
  )

  const predictedTier = tierFromScore(predictedScore)
  const predictedImpressionsBucket = impressionsBucket(predictedScore, input.priorityAuthor)
  const predictedEngagementRateBucket = engagementBucket(predictedScore, factors.discussionPotential)
  const predictedProfileVisitsBucket = profileVisitsBucket(predictedScore)
  const predictedActorRatingClicksBucket = clicksBucket(predictedScore, factors.dataAdvantage)

  return {
    predictedScore,
    predictedTier,
    predictedImpressionsBucket,
    predictedEngagementRateBucket,
    predictedProfileVisitsBucket,
    predictedActorRatingClicksBucket,
    predictedFormat: input.contentFormat,
    predictedConceptScore: input.concept?.totalScore ?? input.concept?.estimatedStrength ?? null,
    predictedOpportunityScore: input.originalScore.score,
    predictionModelVersion: ORIGINAL_PREDICTION_VERSION,
    predictionCreatedAt: new Date().toISOString(),
    predictionFactors: factors,
    measurementDimensions: {
      opportunityScore: input.originalScore.score,
      factualConfidence: input.measurement?.factualConfidence ?? null,
      sourceDistributionPriority: input.measurement?.sourceDistributionPriority ?? null,
      sourceReliabilityClass: input.measurement?.sourceReliabilityClass ?? null,
      conceptFormat: input.concept?.format ?? input.contentFormat ?? null,
      writerVersion: input.measurement?.writerVersion ?? null,
      qaOutcome: input.measurement?.qaOutcome ?? null,
      humanApprovalOutcome: input.measurement?.humanApprovalOutcome ?? null,
      publishedOutcome: input.measurement?.publishedOutcome ?? null,
    },
    notes:
      "Heuristic Opportunity Prediction (not ML). Buckets are coarse ranges for later calibration — never overwrite after publish. measurementDimensions are logged separately from predictedScore.",
  }
}

export function mapConceptFormatToTaxonomy(
  format: string | null | undefined,
): string {
  switch (format) {
    case "COMPARISON":
      return "comparison"
    case "RANKING":
      return "ranking"
    case "RADAR_VISUAL":
      return "data_radar"
    case "DISCUSSION_DEBATE":
      return "question_debate"
    case "HISTORICAL_CONTEXT":
      return "observation_analysis"
    default:
      return format?.toLowerCase() || "observation_analysis"
  }
}

export function hashOriginalContent(text: string): string {
  return createHash("sha256").update(normalizeForHash(text)).digest("hex")
}

function normalizeForHash(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

function tierFromScore(score: number): PredictedTier {
  if (score >= 85) return "VERY_HIGH"
  if (score >= 70) return "HIGH"
  if (score >= 50) return "MEDIUM"
  return "LOW"
}

function impressionsBucket(score: number, priority?: boolean): ImpressionBucket {
  const s = score + (priority ? 5 : 0)
  if (s >= 92) return "100k-500k"
  if (s >= 84) return "25k-100k"
  if (s >= 72) return "5k-25k"
  if (s >= 60) return "1k-5k"
  return "<1k"
}

function engagementBucket(score: number, discussion: number): string {
  const d = (score + discussion) / 2
  if (d >= 85) return "6%+"
  if (d >= 70) return "4-6%"
  if (d >= 55) return "2-4%"
  return "<2%"
}

function profileVisitsBucket(score: number): string {
  if (score >= 85) return "80+"
  if (score >= 70) return "30-80"
  if (score >= 55) return "10-30"
  return "<10"
}

function clicksBucket(score: number, data: number): string {
  const d = (score + data) / 2
  if (d >= 85) return "35+"
  if (d >= 70) return "15-35"
  if (d >= 55) return "5-15"
  return "<5"
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Lightweight actual vs prediction comparison when impressions exist.
 * Null actualNormalized when metrics pending.
 */
export function comparePredictionToActual(input: {
  predictedScore: number
  impressions: number | null | undefined
  likes?: number | null
  replies?: number | null
}): {
  status: "pending" | "beat" | "met" | "missed"
  actualNormalizedScore: number | null
  delta: number | null
  label: string
} {
  if (input.impressions == null) {
    return {
      status: "pending",
      actualNormalizedScore: null,
      delta: null,
      label: "Metrics pending",
    }
  }
  // Coarse normalize impressions → 0–100 for display only
  const imp = input.impressions
  let actual = 20
  if (imp >= 500_000) actual = 98
  else if (imp >= 100_000) actual = 90
  else if (imp >= 25_000) actual = 80
  else if (imp >= 5_000) actual = 68
  else if (imp >= 1_000) actual = 55
  else actual = 35

  const eng = (input.likes ?? 0) + (input.replies ?? 0) * 2
  if (imp > 0 && eng / imp > 0.05) actual = Math.min(100, actual + 5)

  const delta = actual - input.predictedScore
  let status: "beat" | "met" | "missed" = "met"
  if (delta >= 8) status = "beat"
  else if (delta <= -8) status = "missed"

  return {
    status,
    actualNormalizedScore: actual,
    delta,
    label:
      status === "beat"
        ? "Beat expected range"
        : status === "missed"
          ? "Below expected range"
          : "Within expected range",
  }
}
