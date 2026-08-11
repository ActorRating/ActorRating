import { randomUUID } from "crypto"
import { getGovernorSnapshot, governorAllowsOpportunity } from "@/lib/arie/cost-governor"
import { loadBrandConstitution } from "@/lib/arie/constitution"
import { groqJsonCompletion } from "@/lib/arie/groq"
import { arieLog } from "@/lib/arie/log"
import { loadAriePrompt } from "@/lib/arie/prompt-loader"
import type { ContextPackage } from "@/lib/arie/types"
import {
  ORIGINAL_CONCEPT_PROMPT_VERSION,
  conceptsAreDistinct,
  type ConceptScoreBreakdown,
  type OriginalConcept,
  type OriginalScoreResult,
} from "@/lib/arie/original-types"
import { parseConceptsWithZod } from "@/lib/arie/original-schemas"

function clamp01to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Deterministic concept ranking on top of LLM estimatedStrength.
 * Prefer ActorRating advantage, discussion, visual, uniqueness vs news paraphrase.
 */
export function rankOriginalConcepts(
  concepts: OriginalConcept[],
  ctx: {
    score: OriginalScoreResult
    package: ContextPackage
  },
): {
  ranked: OriginalConcept[]
  selected: OriginalConcept
  explanation: string
} {
  const annotated = concepts.map((c) => annotateConceptEvidence(c, ctx.package))
  const ranked = annotated.map((c) => {
    const scores = scoreConcept(c, ctx)
    const totalScore = Math.round(
      0.2 * scores.actorRatingAdvantage +
        0.15 * scores.originality +
        0.15 * scores.discussionPotential +
        0.1 * scores.clarity +
        0.1 * scores.dataUsefulness +
        0.1 * scores.visualPotential +
        0.1 * scores.timeliness +
        0.1 * scores.brandFit,
    )
    return { ...c, scores, totalScore }
  })
  ranked.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
  const selected = ranked[0]!
  const explanation = [
    `Selected ${selected.id} (${selected.format}) at ${selected.totalScore}.`,
    `Advantage: ${selected.actorRatingAdvantage}`,
    selected.requiresAttribution ? "Requires attribution (reported evidence)." : "Fully AR-grounded preferred path.",
    `Hook: ${selected.hook}`,
    ranked.length > 1
      ? `Runner-up: ${ranked[1]!.id} ${ranked[1]!.format} (${ranked[1]!.totalScore}).`
      : "",
  ]
    .filter(Boolean)
    .join(" ")

  return { ranked, selected, explanation }
}

/** Prefer concepts that need fewer unsupported assumptions while still riding the news cycle. */
function annotateConceptEvidence(c: OriginalConcept, pkg: ContextPackage): OriginalConcept {
  const uncertain = (pkg.evidence?.uncertain.length ?? 0) + (pkg.evidence?.contradicted.length ?? 0)
  const reported = pkg.evidence?.reported.length ?? 0
  const assumesEvent =
    /\b(returns?|joins?|will|doomsday|secret wars|iron spider|confirmed)\b/i.test(
      `${c.hook} ${c.angle} ${c.discussionQuestion}`,
    )
  const requiresAttribution =
    c.requiresAttribution ??
    Boolean((reported > 0 || uncertain > 0) && assumesEvent)
  const groundedInUncertainClaim =
    c.groundedInUncertainClaim ?? Boolean(assumesEvent && (uncertain > 0 || reported > 0))
  const riskFlags = [...(c.riskFlags ?? [])]
  if (requiresAttribution && !riskFlags.includes("requires_attribution")) {
    riskFlags.push("requires_attribution")
  }
  if (groundedInUncertainClaim && !riskFlags.includes("uncertain_event_dependence")) {
    riskFlags.push("uncertain_event_dependence")
  }
  return { ...c, requiresAttribution, groundedInUncertainClaim, riskFlags }
}

function scoreConcept(
  c: OriginalConcept,
  ctx: { score: OriginalScoreResult; package: ContextPackage },
): ConceptScoreBreakdown {
  const hasData =
    (ctx.package.facts?.length ?? 0) > 0 ||
    (ctx.package.topPerformances?.length ?? 0) > 0 ||
    Boolean(ctx.package.radar)
  const genericNews =
    /is back|returns as|joins|will star|what do you think\??$/i.test(c.hook) &&
    c.dataUsed.length === 0
  const uncertainPenalty = c.groundedInUncertainClaim ? 18 : 0
  const attributionPenalty = c.requiresAttribution && c.dataUsed.length === 0 ? 10 : 0
  const arGroundedBoost =
    !c.groundedInUncertainClaim && c.dataUsed.length > 0 && hasData ? 12 : 0

  return {
    actorRatingAdvantage: clamp01to100(
      (c.actorRatingAdvantage.length > 20 ? 70 : 40) +
        c.dataUsed.length * 8 +
        (hasData ? 10 : -15) +
        arGroundedBoost -
        uncertainPenalty,
    ),
    originality: clamp01to100(
      (genericNews ? 25 : 70) +
        (c.format === "DISCUSSION_DEBATE" || c.format === "COMPARISON" ? 10 : 0) -
        (c.riskFlags.includes("news_paraphrase") ? 30 : 0) -
        attributionPenalty,
    ),
    discussionPotential: clamp01to100(
      (c.discussionQuestion.includes("?") ? 75 : 40) +
        (/\bwhich|who|agree|rank|keep one|versus|vs\b/i.test(c.discussionQuestion) ? 15 : 0),
    ),
    clarity: clamp01to100(c.hook.length <= 90 && c.hook.length >= 12 ? 80 : 55),
    dataUsefulness: clamp01to100(
      c.dataUsed.length * 20 + (hasData ? 20 : 0) + Math.min(20, ctx.score.breakdown.data * 2),
    ),
    visualPotential: clamp01to100(
      (/radar|rank|comparison|vs|chart|list/i.test(c.visualPotential + c.format)
        ? 75
        : 45) + (ctx.score.breakdown.visual >= 12 ? 15 : 0),
    ),
    timeliness: clamp01to100(50 + ctx.score.breakdown.timing * 8 + ctx.score.breakdown.heat),
    brandFit: clamp01to100(
      60 +
        (/ActorRating|performance|radar|craft|rank/i.test(
          c.hook + c.angle + c.actorRatingAdvantage,
        )
          ? 25
          : 0) -
        (c.riskFlags.includes("off_brand") ? 40 : 0),
    ),
  }
}

function slimContextForConcepts(pkg: ContextPackage) {
  return {
    event: pkg.event,
    opportunity_reply_score: pkg.opportunity.score,
    coverage: pkg.coverage,
    writerMode: pkg.writerMode,
    factualConfidence: pkg.factualConfidence,
    sourceProvenance: pkg.sourceProvenance
      ? {
          handle: pkg.sourceProvenance.handle,
          reliabilityClass: pkg.sourceProvenance.reliabilityClass,
          distributionPriority: pkg.sourceProvenance.distributionPriority,
        }
      : null,
    evidence: pkg.evidence
      ? {
          writerMode: pkg.evidence.writerMode,
          factualConfidence: pkg.evidence.factualConfidence,
          confirmed: pkg.evidence.confirmed.map((c) => c.text).slice(0, 8),
          reported: pkg.evidence.reported.map((c) => c.text).slice(0, 6),
          uncertain: pkg.evidence.uncertain.map((c) => c.text).slice(0, 6),
          contradicted: pkg.evidence.contradicted.map((c) => c.text).slice(0, 4),
          missingEvidence: pkg.evidence.missingEvidence,
        }
      : null,
    actor: pkg.actor,
    actors: pkg.actors,
    movie: pkg.movie,
    director: pkg.director,
    radar: pkg.radar,
    topPerformances: pkg.topPerformances.slice(0, 8),
    relatedPerformances: pkg.relatedPerformances.slice(0, 6),
    communityRating: pkg.communityRating,
    similarActors: pkg.similarActors.slice(0, 5),
    facts: pkg.facts.slice(0, 20).map((f) => ({
      fact_id: f.fact_id,
      type: f.type,
      text: f.text,
      value: f.value,
    })),
    links: pkg.links.slice(0, 8),
    unresolved: pkg.unresolved,
  }
}

export async function generateOriginalConcepts(input: {
  package: ContextPackage
  originalScore: OriginalScoreResult
  /** Skip cost governor (admin eval) — still meters usage via Groq. */
  bypassGovernor?: boolean
}): Promise<
  | {
      ok: true
      concepts: OriginalConcept[]
      selected: OriginalConcept
      rankExplanation: string
      model: string
      promptVersion: string
      usage: { promptTokens: number; completionTokens: number }
      generationMs: number
    }
  | { ok: false; reason: string }
> {
  if (!input.bypassGovernor) {
    const snap = await getGovernorSnapshot(55)
    const gate = governorAllowsOpportunity(snap, {
      opportunityScore: input.originalScore.score,
      priorityAuthor: input.package.opportunity.priorityAuthor,
    })
    if (!gate.allowed) {
      return { ok: false, reason: gate.reason }
    }
  }

  if (!input.originalScore.eligible) {
    return { ok: false, reason: "opportunity_not_eligible" }
  }

  const constitution = await loadBrandConstitution()
  let promptBody: string
  try {
    promptBody = await loadAriePrompt("original-concept/v1.0.md")
  } catch {
    promptBody = FALLBACK_CONCEPT_PROMPT
  }

  const system = [
    promptBody,
    "",
    "## Brand Constitution (law)",
    constitution.text.slice(0, 6000),
    "",
    `Prompt version: ${ORIGINAL_CONCEPT_PROMPT_VERSION}`,
  ].join("\n")

  const user = JSON.stringify(
    {
      instruction:
        "Generate up to 3 DISTINCT original-content concepts. Return JSON { concepts: [...] }. Prefer concepts grounded in confirmed ActorRating data. If a concept depends on REPORTED/UNVERIFIED news, set requiresAttribution=true. Prefer discussion/hypothetical framing when evidence is weak. Never invent ratings.",
      originalScore: input.originalScore,
      context: slimContextForConcepts(input.package),
    },
    null,
    0,
  )

  const result = await groqJsonCompletion({
    system,
    user,
    operation: "original_concept_v1",
  })
  if (!result.ok) return { ok: false, reason: result.reason }

  const json = result.json as { concepts?: unknown }
  const parsed = parseConceptsWithZod(json)
  if (!parsed.ok) {
    await arieLog("warn", "original", "concept_schema_fail", { reason: parsed.reason })
    return { ok: false, reason: parsed.reason }
  }

  // Ensure ids
  const withIds = parsed.concepts.map((c, i) => ({
    ...c,
    id: c.id || `c${i + 1}-${randomUUID().slice(0, 6)}`,
  }))

  const distinct = conceptsAreDistinct(withIds)
  if (!distinct.ok) {
    await arieLog("warn", "original", "concepts_not_distinct", { reason: distinct.reason })
    // Soft-fail: still rank but flag
  }

  const { ranked, selected, explanation } = rankOriginalConcepts(withIds, {
    score: input.originalScore,
    package: input.package,
  })

  if (!distinct.ok) {
    ranked.forEach((c) => {
      if (!c.riskFlags.includes("low_distinctness")) c.riskFlags.push("low_distinctness")
    })
  }

  return {
    ok: true,
    concepts: ranked,
    selected,
    rankExplanation: explanation + (distinct.ok ? "" : ` Warning: ${distinct.reason}`),
    model: result.model,
    promptVersion: ORIGINAL_CONCEPT_PROMPT_VERSION,
    usage: result.usage,
    generationMs: result.generationMs,
  }
}

const FALLBACK_CONCEPT_PROMPT = `You are ARIE Concept Strategist for ActorRating.
Generate up to 3 DISTINCT concepts from formats: RANKING, COMPARISON, RADAR_VISUAL, HISTORICAL_CONTEXT, DISCUSSION_DEBATE.
Each concept needs: format, hook, angle, actorRatingAdvantage, discussionQuestion, dataUsed[], visualPotential, estimatedStrength 0-100, riskFlags[].
Never invent ActorRating numbers. Event is the trigger; ActorRating data is the differentiator.
Return JSON only: { "concepts": [ ... ] }`
