/**
 * ActorRating-native concept payload validation.
 * Ensures concepts are not generic news paraphrases.
 */

import type { ContextPackage } from "@/lib/arie/types"
import type { ActorRatingPayloadType, OriginalConcept } from "@/lib/arie/original-types"

export { type ActorRatingPayloadType } from "@/lib/arie/original-types"

export type ActorRatingPayloadMeta = {
  actorRatingPayloadPresent: boolean
  payloadType: ActorRatingPayloadType | null
  payloadSummary: string | null
}

const GENERIC_NEWS_HOOK_RE =
  /^(?:\w+\s+){0,4}(?:is reportedly joining|joins|returns as|is returning|will return|will star|what do you think\??|thoughts\??)$/i

const GENERIC_NEWS_ANGLE_RE =
  /\b(reportedly joining|returns as|will star in|breaking news|what do you think|thoughts\??)\b/i

/** Derive whether context + concept carry a genuine ActorRating payload. */
export function deriveActorRatingPayload(
  concept: Pick<
    OriginalConcept,
    "hook" | "angle" | "actorRatingAdvantage" | "discussionQuestion" | "dataUsed" | "format"
  >,
  pkg: Pick<
    ContextPackage,
    "topPerformances" | "relatedPerformances" | "radar" | "facts" | "communityRating" | "coverage" | "actor" | "director"
  >,
): ActorRatingPayloadMeta {
  const text = `${concept.hook} ${concept.angle} ${concept.actorRatingAdvantage} ${concept.discussionQuestion}`.toLowerCase()
  const hasPerf = (pkg.topPerformances?.length ?? 0) > 0
  const hasRelated = (pkg.relatedPerformances?.length ?? 0) > 0
  const hasRadar = Boolean(
    pkg.radar && Object.values(pkg.radar.dimensions).some((v) => typeof v === "number"),
  )
  const hasCommunity = Boolean(pkg.communityRating && pkg.communityRating.ratingCount > 0)
  const hasFacts = (pkg.facts?.length ?? 0) > 0
  const hasCoverage = (pkg.coverage?.percent ?? 0) >= 40
  const dataUsed = concept.dataUsed.filter(Boolean)

  let payloadType: ActorRatingPayloadType | null = null

  const mentionsArData =
    dataUsed.length > 0 ||
    /actorrating|performance score|aggregate|radar|craft|compare|rank|trajectory|filmography|midsommar|nolan/i.test(
      `${concept.hook} ${concept.angle} ${concept.actorRatingAdvantage}`,
    )

  if (
    concept.format === "COMPARISON" ||
    /\bvs\.?\b|versus|compare|comparison|stack up|stronger performance/i.test(text)
  ) {
    payloadType = "comparison"
  } else if (hasRadar && /radar|craft dimension/i.test(text)) {
    payloadType = "radar_craft"
  } else if (hasRelated && /compare|versus/i.test(text)) {
    payloadType = "actor_comparison"
  } else if (
    concept.format === "HISTORICAL_CONTEXT" ||
    /\btrajectory|career arc|over the years|legacy|run as|filmography/i.test(text)
  ) {
    payloadType = "career_trajectory"
  } else if (/\boscar|emmy|award|nomination|golden globe/i.test(text)) {
    payloadType = "award_context"
  } else if (/\bfranchise|marvel|mcu|sequel|trilogy|universe/i.test(text)) {
    payloadType = "franchise_context"
  } else if (hasCommunity || /community rating|fans rated|user rating/i.test(text)) {
    payloadType = "community_signal"
  } else if (pkg.director && /\bdirector|nolan|guadagnino|collaborat/i.test(text)) {
    payloadType = "director_pattern"
  } else if (hasPerf || /performances? score|aggregate|rated/i.test(text)) {
    payloadType = "performance_score"
  } else if (dataUsed.length > 0 && hasFacts) payloadType = "performance_score"

  const actorRatingPayloadPresent =
    payloadType !== null &&
    mentionsArData &&
    (dataUsed.length > 0 ||
      concept.actorRatingAdvantage.length >= 25 ||
      /actorrating|performance|compare|rank|trajectory|aggregate|radar/i.test(
        concept.actorRatingAdvantage,
      ))

  const payloadSummary = actorRatingPayloadPresent
    ? payloadType
      ? `ActorRating ${payloadType.replace(/_/g, " ")}`
      : "ActorRating data-backed angle"
    : null

  return { actorRatingPayloadPresent, payloadType, payloadSummary }
}

/** Reject generic news-bot concepts that lack ActorRating payload. */
export function isGenericNewsConcept(
  concept: Pick<
    OriginalConcept,
    "hook" | "angle" | "discussionQuestion" | "dataUsed" | "actorRatingAdvantage" | "format"
  >,
  meta: ActorRatingPayloadMeta,
): boolean {
  if (meta.actorRatingPayloadPresent) return false

  const hook = concept.hook.trim()
  if (GENERIC_NEWS_HOOK_RE.test(hook)) return true
  if (
    GENERIC_NEWS_ANGLE_RE.test(`${concept.hook} ${concept.angle}`) &&
    concept.dataUsed.length === 0
  ) {
    return true
  }
  if (/what do you think\??$/i.test(concept.discussionQuestion.trim()) && concept.dataUsed.length === 0) {
    return true
  }
  if (
    /^(?:\w+\s+){0,6}(?:returns? as|is reportedly|joins|will star)/i.test(hook) &&
    concept.dataUsed.length === 0 &&
    concept.actorRatingAdvantage.length < 30
  ) {
    return true
  }
  return false
}

/** Annotate concepts with payload metadata; filter generic news concepts. */
export function validateConceptPayloads(
  concepts: OriginalConcept[],
  pkg: ContextPackage,
): { concepts: OriginalConcept[]; rejected: Array<{ id: string; reason: string }> } {
  const rejected: Array<{ id: string; reason: string }> = []
  const kept: OriginalConcept[] = []

  for (const c of concepts) {
    const meta = deriveActorRatingPayload(c, pkg)
    const generic = isGenericNewsConcept(c, meta)
    const annotated: OriginalConcept = {
      ...c,
      actorRatingPayloadPresent: meta.actorRatingPayloadPresent,
      payloadType: meta.payloadType,
      payloadSummary: meta.payloadSummary,
      riskFlags: generic
        ? [...(c.riskFlags ?? []), "generic_news_no_payload"]
        : [...(c.riskFlags ?? [])],
    }
    if (generic) {
      rejected.push({ id: c.id, reason: "generic_news_no_payload" })
      continue
    }
    if (!meta.actorRatingPayloadPresent) {
      rejected.push({ id: c.id, reason: "missing_actorrating_payload" })
      continue
    }
    kept.push(annotated)
  }

  return { concepts: kept, rejected }
}
