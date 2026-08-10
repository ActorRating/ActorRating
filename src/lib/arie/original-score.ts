import { createHash } from "crypto"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"
import { CASTING_RE } from "@/lib/arie/opportunity-score"
import { isPriorityAuthor } from "@/lib/arie/priority-accounts"
import type { ContextPackage } from "@/lib/arie/types"
import type {
  OriginalEventType,
  OriginalScoreBreakdown,
  OriginalScoreResult,
} from "@/lib/arie/original-types"
import { ORIGINAL_ELIGIBLE_MIN } from "@/lib/arie/original-types"

const TRAILER_RE = /\b(trailer|teaser|first look|first[- ]look)\b/i
const RELEASE_RE = /\b(releases?|opens?|premiere|coming to theaters|hits theaters|now streaming)\b/i
const AWARDS_RE = /\b(oscar|academy award|emmy|golden globe|bafta|nominat|wins? best)\b/i
const FRANCHISE_RE =
  /\b(franchise|sequel|prequel|reboot|remake|spin[- ]?off|universe|cinematic)\b/i
const DIRECTOR_RE = /\b(direct(?:s|ed|ing)?|helms?|behind the camera)\b/i
const RANKING_RE = /\b(rank(?:ed|ing)?|best|worst|top \d+|tier list|underrated|overrated)\b/i
const ANNIVERSARY_RE = /\b(\d{1,3}(?:st|nd|rd|th)? anniversary|years ago|this day in)\b/i
const CONTROVERSY_RE =
  /\b(backlash|controversy|divisive|criticized for (?:the )?performance|acting debate)\b/i

const GOSSIP_RE =
  /\b(dating|divorces?|split|pregnant|scandal|beef|feud|wedding|married|marriage|girlfriend|boyfriend|engaged)\b/i
const MUSIC_PROMO_RE = /\b(music video|album|single|billboard|tour dates?|concert)\b/i
const POLITICS_RE = /\b(election|president|congress|democrat|republican)\b/i

/**
 * Deterministic Original Content Opportunity Score.
 * Weights (points out of 100): heat 30, relevance 20, visual 20, discussion 15, data 10, timing 5.
 * Velocity is unknown unless callers supply mention/engagement signals — never fabricated.
 */
export function scoreOriginalOpportunity(input: {
  text: string
  authorHandle?: string | null
  entities: ExtractedEntities
  context?: Pick<
    ContextPackage,
    | "actor"
    | "actors"
    | "movie"
    | "director"
    | "radar"
    | "topPerformances"
    | "relatedPerformances"
    | "communityRating"
    | "facts"
    | "coverage"
  > | null
  ageMinutes?: number
  /** Optional real velocity signal 0–100. Omit → velocity unknown. */
  heatHint?: number | null
}): OriginalScoreResult {
  const reasonCodes: string[] = []
  const priorityAuthor = isPriorityAuthor(input.authorHandle)
  const eventType = classifyOriginalEventType(input.text)
  const offBrand = isOffBrandOriginal(input.text)

  if (offBrand) reasonCodes.push("off_brand_topic")
  if (eventType === "ignore") reasonCodes.push("weak_event_type")

  const hasActor = input.entities.actors.length > 0 || Boolean(input.context?.actor)
  const hasMovie = input.entities.movies.length > 0 || Boolean(input.context?.movie)
  const hasDirector = input.entities.directors.length > 0 || Boolean(input.context?.director)
  const perfCount = input.context?.topPerformances?.length ?? 0
  const relatedCount = input.context?.relatedPerformances?.length ?? 0
  const hasRadar = Boolean(
    input.context?.radar &&
      Object.values(input.context.radar.dimensions).some((v) => typeof v === "number"),
  )
  const hasCommunity = Boolean(
    input.context?.communityRating && input.context.communityRating.ratingCount > 0,
  )
  const coveragePct = input.context?.coverage?.percent ?? 0

  // --- Heat 0–30 ---
  let heat = 8
  let velocity: OriginalScoreResult["velocity"] = "unknown"
  if (typeof input.heatHint === "number" && Number.isFinite(input.heatHint)) {
    heat = Math.round((clamp100(input.heatHint) / 100) * 30)
    if (input.heatHint >= 85) velocity = "exploding"
    else if (input.heatHint >= 70) velocity = "accelerating"
    else if (input.heatHint >= 45) velocity = "active"
    else velocity = "stale"
    reasonCodes.push("heat_from_hint")
  } else {
    // Proxy only — not fabricated velocity
    if (priorityAuthor) heat += 12
    if (eventType === "casting" || eventType === "franchise" || eventType === "trailer") heat += 6
    if (eventType === "awards") heat += 4
    heat = Math.min(30, heat)
    reasonCodes.push("velocity_unknown")
  }
  if (offBrand) heat = Math.min(heat, 6)

  // --- Relevance 0–20 ---
  let relevance = 4
  if (hasActor) relevance += 7
  if (hasMovie) relevance += 5
  if (hasDirector) relevance += 4
  if (input.entities.actors.length >= 2) relevance += 2
  if (eventType === "casting" || eventType === "franchise" || eventType === "ranking_debate") {
    relevance += 2
  }
  if (offBrand) relevance = Math.min(relevance, 4)
  relevance = Math.min(20, relevance)

  // --- Visual 0–20 ---
  let visual = 3
  if (hasRadar) visual += 7
  if (perfCount >= 2) visual += 5
  if (relatedCount >= 2 || input.entities.actors.length >= 2) visual += 4
  if (perfCount >= 1) visual += 2
  visual = Math.min(20, visual)

  // --- Discussion 0–15 ---
  let discussion = 3
  if (eventType === "ranking_debate" || eventType === "controversy_craft") discussion += 6
  if (eventType === "casting" || eventType === "franchise") discussion += 4
  if (input.entities.actors.length >= 2 || relatedCount >= 2) discussion += 4
  if (RANKING_RE.test(input.text) || /\bvs\.?\b|versus\b/i.test(input.text)) discussion += 2
  discussion = Math.min(15, discussion)

  // --- Data richness 0–10 ---
  let data = 1
  if (hasActor) data += 2
  if (perfCount > 0) data += 2
  if (hasRadar) data += 2
  if (hasCommunity) data += 1
  if (coveragePct >= 40) data += 1
  if (coveragePct >= 60) data += 1
  data = Math.min(10, data)
  if (!hasActor && !hasMovie && !hasDirector) {
    data = 1
    reasonCodes.push("no_ar_entities")
  }

  // --- Timing 0–5 ---
  const age = input.ageMinutes ?? 5
  let timing = 5
  if (age > 60) timing = 4
  if (age > 360) timing = 3
  if (age > 1440) timing = 2
  if (age > 4320) timing = 1
  if (age > 10080) timing = 0

  const breakdown: OriginalScoreBreakdown = {
    heat,
    relevance,
    visual,
    discussion,
    data,
    timing,
  }
  const score = Math.round(
    heat + relevance + visual + discussion + data + timing,
  )

  const actorRatingAdvantage = describeAdvantage({
    hasActor,
    hasMovie,
    hasDirector,
    hasRadar,
    perfCount,
    relatedCount,
    hasCommunity,
    eventType,
  })

  let eligible = score >= ORIGINAL_ELIGIBLE_MIN && !offBrand && eventType !== "ignore"
  if (data < 3) {
    eligible = false
    reasonCodes.push("insufficient_data_advantage")
  }
  if (!hasActor && !hasMovie) {
    eligible = false
    reasonCodes.push("missing_core_entities")
  }
  if (eligible) reasonCodes.push("original_eligible")
  else reasonCodes.push("original_ineligible")

  return {
    score,
    breakdown,
    eligible,
    reasonCodes,
    eventType,
    velocity,
    actorRatingAdvantage,
  }
}

export function classifyOriginalEventType(text: string): OriginalEventType {
  if (isOffBrandOriginal(text) && !CASTING_RE.test(text)) return "ignore"
  if (CASTING_RE.test(text)) return "casting"
  if (TRAILER_RE.test(text)) return "trailer"
  if (AWARDS_RE.test(text)) return "awards"
  if (FRANCHISE_RE.test(text)) return "franchise"
  if (RELEASE_RE.test(text)) return "release"
  if (DIRECTOR_RE.test(text)) return "director"
  if (RANKING_RE.test(text)) return "ranking_debate"
  if (ANNIVERSARY_RE.test(text)) return "anniversary"
  if (CONTROVERSY_RE.test(text)) return "controversy_craft"
  // Entity-bearing film news without strong signal
  if (/\b(actor|actress|movie|film|director|cast)\b/i.test(text)) return "other"
  return "ignore"
}

export function isOffBrandOriginal(text: string): boolean {
  return GOSSIP_RE.test(text) || MUSIC_PROMO_RE.test(text) || POLITICS_RE.test(text)
}

/**
 * Dedupe key: event type + sorted entity ids (or normalized names) — no day bucket,
 * so Deadline + Variety same casting collapse.
 */
export function buildOriginalDedupeKey(input: {
  eventType: OriginalEventType
  entities: ExtractedEntities
  text: string
}): string {
  const actors = input.entities.actors
    .map((a) => `a:${a.id}`)
    .sort()
    .join(",")
  const movies = input.entities.movies
    .map((m) => `m:${m.id}`)
    .sort()
    .join(",")
  const directors = input.entities.directors
    .map((d) => `d:${normalizeName(d.name)}`)
    .sort()
    .join(",")
  const base = [input.eventType, actors || "a:none", movies || "m:none", directors || "d:none"].join(
    "|",
  )
  // Fallback fingerprint when entities missing
  const textFinger = createHash("sha1")
    .update(normalizeName(input.text).slice(0, 160))
    .digest("hex")
    .slice(0, 12)
  const material = actors || movies ? base : `${base}|t:${textFinger}`
  return createHash("sha1").update(material).digest("hex").slice(0, 24)
}

/** Expiration TTL by event type. */
export function originalExpiresAt(
  eventType: OriginalEventType,
  from = new Date(),
): Date {
  const hours: Record<OriginalEventType, number> = {
    casting: 36,
    trailer: 72,
    release: 48,
    awards: 120,
    franchise: 48,
    director: 48,
    ranking_debate: 168,
    anniversary: 336,
    controversy_craft: 48,
    other: 48,
    ignore: 12,
  }
  return new Date(from.getTime() + (hours[eventType] ?? 48) * 60 * 60 * 1000)
}

function describeAdvantage(input: {
  hasActor: boolean
  hasMovie: boolean
  hasDirector: boolean
  hasRadar: boolean
  perfCount: number
  relatedCount: number
  hasCommunity: boolean
  eventType: OriginalEventType
}): string {
  const bits: string[] = []
  if (input.perfCount > 0) bits.push(`${input.perfCount} ActorRating performance score(s)`)
  if (input.hasRadar) bits.push("radar craft dimensions")
  if (input.relatedCount > 0) bits.push("related performance comparisons")
  if (input.hasCommunity) bits.push("community ratings")
  if (input.hasDirector) bits.push("director filmography context")
  if (!bits.length) {
    if (input.hasActor || input.hasMovie) return "Entity resolution only — thin data advantage"
    return "No clear ActorRating advantage"
  }
  return `ActorRating can add: ${bits.join(", ")} (${input.eventType})`
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").trim()
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}
