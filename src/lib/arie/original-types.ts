/** Original Content Opportunity types, statuses, formats, and runtime validators. */

export const ORIGINAL_CONCEPT_PROMPT_VERSION = "original-concept@v1.0"
export const ORIGINAL_WRITER_PROMPT_VERSION = "original-writer@v1.0"
export const ORIGINAL_QA_PROMPT_VERSION = "original-qa@v1.0"

export const ORIGINAL_STATUSES = [
  "NEW",
  "SCORED",
  "ELIGIBLE",
  "CONCEPTS_GENERATED",
  "CONCEPT_SELECTED",
  "DRAFT_GENERATED",
  "QA_PASSED",
  "QA_FAILED",
  "READY",
  "APPROVED",
  "PUBLISHING",
  "PUBLISHED",
  "IGNORED",
  "EXPIRED",
  "REJECTED",
  "FAILED",
  "DUPLICATE",
] as const

export type OriginalStatus = (typeof ORIGINAL_STATUSES)[number]

export const ORIGINAL_FORMATS = [
  "RANKING",
  "COMPARISON",
  "RADAR_VISUAL",
  "HISTORICAL_CONTEXT",
  "DISCUSSION_DEBATE",
] as const

export type OriginalFormat = (typeof ORIGINAL_FORMATS)[number]

export type OriginalScoreBreakdown = {
  /** Topic heat 0–30 */
  heat: number
  /** Actor/movie relevance 0–20 */
  relevance: number
  /** Visual potential 0–20 */
  visual: number
  /** Discussion potential 0–15 */
  discussion: number
  /** Data richness / ActorRating advantage 0–10 */
  data: number
  /** Timing freshness 0–5 */
  timing: number
}

export type OriginalScoreResult = {
  score: number
  breakdown: OriginalScoreBreakdown
  eligible: boolean
  reasonCodes: string[]
  eventType: OriginalEventType
  velocity: "unknown" | "stale" | "active" | "accelerating" | "exploding"
  actorRatingAdvantage: string
}

export type OriginalEventType =
  | "casting"
  | "trailer"
  | "release"
  | "awards"
  | "franchise"
  | "director"
  | "ranking_debate"
  | "anniversary"
  | "controversy_craft"
  | "other"
  | "ignore"

export type OriginalConcept = {
  id: string
  format: OriginalFormat
  hook: string
  angle: string
  actorRatingAdvantage: string
  discussionQuestion: string
  dataUsed: string[]
  visualPotential: string
  estimatedStrength: number
  riskFlags: string[]
  scores?: ConceptScoreBreakdown
  totalScore?: number
}

export type ConceptScoreBreakdown = {
  actorRatingAdvantage: number
  originality: number
  discussionPotential: number
  clarity: number
  dataUsefulness: number
  visualPotential: number
  timeliness: number
  brandFit: number
}

export type VisualSpec = {
  type:
    | "radar_comparison"
    | "actor_comparison"
    | "ranked_list"
    | "performance_comparison"
    | "filmography_timeline"
    | "score_card"
    | "movie_actor_matchup"
    | "none"
  title: string
  subjects: string[]
  dimensions?: string[]
  data: Array<{
    label: string
    value: number | string | null
    factIds?: string[]
    source: "actorrating_db"
  }>
  layout: string
  caption: string
  assetRequirements: string[]
  eligible: boolean
  reason?: string
}

export type OriginalDraft = {
  text: string
  visual: VisualSpec
  entities: Array<{ type: string; id?: string; name: string }>
  links: Array<{ rel: string; href: string; label: string }>
  sourceReferences: Array<{ kind: string; value: string }>
  confidence: number
  claims: string[]
}

export type DeterministicQaResult = {
  passed: boolean
  errors: string[]
  warnings: string[]
}

export type SemanticQaResult = {
  passed: boolean
  confidence: number
  scores: {
    factualAccuracy: number
    relevance: number
    originality: number
    insight: number
    brandVoice: number
    discussionQuality: number
    actorRatingAdvantage: number
    hallucinationRisk: number
  }
  errors: string[]
  warnings: string[]
  summary: string
}

export type OriginalQaResult = {
  deterministic: DeterministicQaResult
  semantic: SemanticQaResult | null
  passed: boolean
  ranAt: string
}

export const MAX_CONCEPT_GEN = 3
export const MAX_DRAFT_GEN = 3
export const MAX_QA_RUNS = 5
export const ORIGINAL_ELIGIBLE_MIN = 55
export const X_ORIGINAL_MAX_CHARS = 280

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export function isOriginalFormat(v: unknown): v is OriginalFormat {
  return typeof v === "string" && (ORIGINAL_FORMATS as readonly string[]).includes(v)
}

export function parseConceptsArray(raw: unknown): { ok: true; concepts: OriginalConcept[] } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: "concepts_not_array" }
  const concepts: OriginalConcept[] = []
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    if (!isObject(item)) return { ok: false, reason: `concept_${i}_not_object` }
    if (!isOriginalFormat(item.format)) return { ok: false, reason: `concept_${i}_bad_format` }
    if (typeof item.hook !== "string" || !item.hook.trim()) return { ok: false, reason: `concept_${i}_bad_hook` }
    if (typeof item.angle !== "string" || !item.angle.trim()) return { ok: false, reason: `concept_${i}_bad_angle` }
    if (typeof item.actorRatingAdvantage !== "string" || !item.actorRatingAdvantage.trim()) {
      return { ok: false, reason: `concept_${i}_missing_advantage` }
    }
    if (typeof item.discussionQuestion !== "string" || !item.discussionQuestion.trim()) {
      return { ok: false, reason: `concept_${i}_bad_question` }
    }
    if (!Array.isArray(item.dataUsed)) return { ok: false, reason: `concept_${i}_bad_dataUsed` }
    if (typeof item.visualPotential !== "string") return { ok: false, reason: `concept_${i}_bad_visual` }
    const strength =
      typeof item.estimatedStrength === "number" && Number.isFinite(item.estimatedStrength)
        ? Math.max(0, Math.min(100, Math.round(item.estimatedStrength)))
        : 50
    const id =
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim()
        : `c${i + 1}`
    concepts.push({
      id,
      format: item.format,
      hook: item.hook.trim(),
      angle: item.angle.trim(),
      actorRatingAdvantage: item.actorRatingAdvantage.trim(),
      discussionQuestion: item.discussionQuestion.trim(),
      dataUsed: item.dataUsed.filter((d): d is string => typeof d === "string"),
      visualPotential: String(item.visualPotential),
      estimatedStrength: strength,
      riskFlags: Array.isArray(item.riskFlags)
        ? item.riskFlags.filter((d): d is string => typeof d === "string")
        : [],
    })
  }
  if (concepts.length < 1) return { ok: false, reason: "no_concepts" }
  if (concepts.length > 3) return { ok: false, reason: "too_many_concepts" }
  return { ok: true, concepts }
}

/** Reject near-duplicate concept angles (same format + high hook overlap). */
export function conceptsAreDistinct(concepts: OriginalConcept[]): { ok: boolean; reason?: string } {
  if (concepts.length < 2) return { ok: true }
  const formats = new Set(concepts.map((c) => c.format))
  if (formats.size < Math.min(2, concepts.length)) {
    // Allow same format only if hooks differ substantially
  }
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const a = normalizeText(concepts[i]!.hook + " " + concepts[i]!.angle)
      const b = normalizeText(concepts[j]!.hook + " " + concepts[j]!.angle)
      if (a === b) return { ok: false, reason: `duplicate_concepts_${i}_${j}` }
      const overlap = tokenOverlap(a, b)
      if (overlap >= 0.72 && concepts[i]!.format === concepts[j]!.format) {
        return { ok: false, reason: `near_duplicate_concepts_${i}_${j}` }
      }
    }
  }
  return { ok: true }
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter((t) => t.length > 2))
  const tb = new Set(b.split(" ").filter((t) => t.length > 2))
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / Math.min(ta.size, tb.size)
}

export function parseVisualSpec(raw: unknown): VisualSpec | null {
  if (!isObject(raw)) return null
  if (typeof raw.type !== "string" || typeof raw.title !== "string") return null
  if (!Array.isArray(raw.subjects) || !Array.isArray(raw.data)) return null
  return {
    type: raw.type as VisualSpec["type"],
    title: raw.title,
    subjects: raw.subjects.filter((s): s is string => typeof s === "string"),
    dimensions: Array.isArray(raw.dimensions)
      ? raw.dimensions.filter((s): s is string => typeof s === "string")
      : undefined,
    data: raw.data
      .filter(isObject)
      .map((d) => ({
        label: String(d.label ?? ""),
        value: (d.value as number | string | null) ?? null,
        factIds: Array.isArray(d.factIds)
          ? d.factIds.filter((x): x is string => typeof x === "string")
          : undefined,
        source: "actorrating_db" as const,
      })),
    layout: typeof raw.layout === "string" ? raw.layout : "default",
    caption: typeof raw.caption === "string" ? raw.caption : "",
    assetRequirements: Array.isArray(raw.assetRequirements)
      ? raw.assetRequirements.filter((s): s is string => typeof s === "string")
      : [],
    eligible: Boolean(raw.eligible),
    reason: typeof raw.reason === "string" ? raw.reason : undefined,
  }
}
