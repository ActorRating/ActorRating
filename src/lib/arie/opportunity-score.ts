import type { OpportunityBreakdown, OpportunityResult } from "@/lib/arie/types"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"
import { isPriorityAuthor } from "@/lib/arie/priority-accounts"

const CASTING_RE =
  /\b(joins?|cast|casting|stars?|set to (star|appear)|boards?|in talks|signs? on|tapped|reunite|reunites)\b/i
const CRAFT_RE =
  /\b(performance|acting|actor|actress| Oscar|emmy|craft|role|character|scene[- ]stealing)\b/i
const GOSSIP_RE = /\b(dating|divorces?|split|pregnant|scandal|beef|feud|cancelled)\b/i
const POLITICS_RE = /\b(election|president|congress|democrat|republican|gaza|ukraine war)\b/i

/**
 * Content Opportunity Score (RFC §11.1).
 * Runs before generation — most events should be ignored cheaply.
 */
export function scoreOpportunity(input: {
  text: string
  authorHandle?: string | null
  entities: ExtractedEntities
  /** Minutes since event received; fresher = higher. */
  ageMinutes?: number
  /** Rough reply crowding 0–100 (higher = more competition). Unknown → 40. */
  competitionHint?: number
}): OpportunityResult {
  const priorityAuthor = isPriorityAuthor(input.authorHandle)
  const reasonCodes: string[] = []

  if (GOSSIP_RE.test(input.text) || POLITICS_RE.test(input.text)) {
    reasonCodes.push("off_brand_topic")
  }

  // Relevance 0–100
  let relevance = 35
  if (CRAFT_RE.test(input.text)) relevance += 20
  if (CASTING_RE.test(input.text)) relevance += 25
  if (priorityAuthor) relevance += 15
  if (reasonCodes.includes("off_brand_topic")) relevance = Math.min(relevance, 25)
  relevance = clamp(relevance)

  // Virality proxy (author priority + length as weak signal)
  let virality = 25
  if (priorityAuthor) virality += 45
  if (input.text.length > 80 && input.text.length < 400) virality += 10
  virality = clamp(virality)

  // ActorRating context — can we ground a reply?
  let arContext = 10
  if (input.entities.actors.length) arContext += 35
  if (input.entities.actors.length >= 2) arContext += 10
  if (input.entities.directors.length) arContext += 25
  if (input.entities.movies.length) arContext += 20
  if (
    input.entities.actors.length === 0 &&
    input.entities.directors.length === 0 &&
    input.entities.movies.length === 0
  ) {
    arContext = 5
    reasonCodes.push("weak_ar_context")
  }
  arContext = clamp(arContext)

  // Uniqueness — Sprint 2 has no post memory yet; mild default
  const uniqueness = 70

  // Competition — invert crowding
  const crowding = input.competitionHint ?? (priorityAuthor ? 55 : 35)
  const competition = clamp(100 - crowding)

  // Freshness
  const age = input.ageMinutes ?? 5
  let freshness = 95
  if (age > 30) freshness = 75
  if (age > 120) freshness = 50
  if (age > 720) freshness = 25
  freshness = clamp(freshness)

  const breakdown: OpportunityBreakdown = {
    relevance,
    virality,
    arContext,
    uniqueness,
    competition,
    freshness,
  }

  const score = Math.round(
    0.3 * relevance +
      0.2 * virality +
      0.2 * arContext +
      0.15 * uniqueness +
      0.1 * competition +
      0.05 * freshness,
  )

  let decision: OpportunityResult["decision"] = score >= 50 ? "process" : "ignore"
  let suggestedFormat: OpportunityResult["suggestedFormat"] = "ignore"

  if (decision === "process") {
    suggestedFormat = CASTING_RE.test(input.text) || priorityAuthor ? "reply" : "reply"
    if (score >= 80 && CASTING_RE.test(input.text)) suggestedFormat = "reply"
  }

  if (reasonCodes.includes("off_brand_topic") && score < 70) {
    decision = "ignore"
    suggestedFormat = "ignore"
    reasonCodes.push("ignored_off_brand")
  }

  if (decision === "ignore") reasonCodes.push("below_threshold")
  else reasonCodes.push("process_candidate")

  return {
    score,
    breakdown,
    decision,
    suggestedFormat,
    reasonCodes,
    priorityAuthor,
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}
