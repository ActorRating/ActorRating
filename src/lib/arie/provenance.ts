/**
 * Sprint 2.5 — claim provenance, source reliability vs distribution,
 * and evidence packaging for originals grounding.
 *
 * SOURCE CLAIM ≠ VERIFIED FACT
 */

import { createHash } from "crypto"
import {
  distributionRank,
  isPriorityAuthor,
  normalizeHandle,
} from "@/lib/arie/priority-accounts"
import type { ArieFact, ContextPackage } from "@/lib/arie/types"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"

export const CLAIM_STATUSES = [
  "VERIFIED",
  "REPORTED",
  "UNVERIFIED",
  "CONTRADICTED",
  "UNKNOWN",
] as const
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

export const SOURCE_RELIABILITY_CLASSES = [
  "PRIMARY",
  "TRADE",
  "ESTABLISHED_ENTERTAINMENT_MEDIA",
  "SPECIALIST",
  "AGGREGATOR",
  "FAN_ACCOUNT",
  "UNKNOWN",
] as const
export type SourceReliabilityClass = (typeof SOURCE_RELIABILITY_CLASSES)[number]

export const DISTRIBUTION_PRIORITIES = ["HIGH", "MEDIUM", "LOW", "NONE"] as const
export type DistributionPriority = (typeof DISTRIBUTION_PRIORITIES)[number]

export type WriterEvidenceMode = "VERIFIED_EVENT" | "REPORTED_EVENT" | "DISCUSSION"

export type ArieClaim = {
  id: string
  subject: string
  predicate: string
  object: string
  status: ClaimStatus
  provenance: "source_assertion" | "actorrating_db" | "system"
  confidence: number
  sourceType: "inbound_event" | "actorrating_db" | "correction" | "system"
  sourceHandle: string | null
  sourceUrl: string | null
  observedAt: string
  verifiedAt: string | null
  corroborationCount: number
  contradictionCount: number
  text: string
  requiresAttribution: boolean
}

export type SourceProvenance = {
  handle: string | null
  sourceCategory: SourceReliabilityClass
  /** Distribution value for opportunity — independent of factual reliability. */
  distributionPriority: DistributionPriority
  distributionRank: number
  reliabilityClass: SourceReliabilityClass
  isPrimary: boolean
  isAggregator: boolean
  observedAt: string
  sourceUrl: string | null
  sourcePostId: string | null
  corroborated: boolean
  laterCorrectionObserved: boolean
}

export type EvidenceBundle = {
  confirmed: ArieClaim[]
  reported: ArieClaim[]
  uncertain: ArieClaim[]
  contradicted: ArieClaim[]
  sourceSummary: string
  confidenceSummary: string
  missingEvidence: string[]
  potentialConflicts: string[]
  factualConfidence: number
  writerMode: WriterEvidenceMode
}

/** Trade / established press — higher factual weight (still not automatic VERIFIED for casting). */
const TRADE_HANDLES = new Set([
  "deadline",
  "variety",
  "thr",
  "hollywoodreporter",
  "discussingfilm",
  "indiewire",
  "ew",
  "empiremagazine",
  "theplaylist",
  "slashfilm",
  "collider",
])

const AGGREGATOR_HANDLES = new Set([
  "boinkbuzz",
  "chaoscrave",
  "chaoscrave_",
  "filmupdates",
])

const SPECIALIST_HANDLES = new Set(["imdb", "letterboxd", "rottentomatoes"])

const PRIMARY_HANDLES = new Set([
  "marvel",
  "marvelstudios",
  "warnerbros",
  "universalpics",
  "paramountpics",
  "netflix",
  "disney",
])

const IRON_SPIDER_RE = /\biron\s*spider\b/i
const RETURN_RE =
  /\b(returns?|returning|will return|set to return|reprises?|coming back|back as)\b/i
const FRANCHISE_EXIT_RE =
  /\b(final (?:time|movie|appearance|performance)|last (?:time|dance|movie|appearance)|bringing .* run to an (?:absolute )?(?:close|end)|signed on for)\b/i
const CASTING_JOIN_RE =
  /\b(joins?|cast|casting|boards?|will (?:star|play|appear)|set to (?:star|play)|tapped|officially cast)\b/i
const CONFIRMED_LANG_RE = /\b(confirmed|officially confirmed|breaking)\b/i
const CORRECTION_RE =
  /\b(no credible sources?|correction|we were wrong|not true|unconfirmed|walks?\s+back|retracts?)\b/i
const ATTRIBUTION_RE =
  /\b(is reporting|reports? that|according to|has been reported|if (?:confirmed|true|it happens)|reportedly|alleged(?:ly)?)\b/i

export function classifySourceReliability(
  handle: string | null | undefined,
): SourceReliabilityClass {
  const h = normalizeHandle(handle)
  if (!h) return "UNKNOWN"
  if (PRIMARY_HANDLES.has(h)) return "PRIMARY"
  if (TRADE_HANDLES.has(h)) return "TRADE"
  if (AGGREGATOR_HANDLES.has(h)) return "AGGREGATOR"
  if (SPECIALIST_HANDLES.has(h)) return "SPECIALIST"
  if (isPriorityAuthor(h)) return "ESTABLISHED_ENTERTAINMENT_MEDIA"
  return "UNKNOWN"
}

const TRUSTED_ORIGINAL_SOURCE_CLASSES: ReadonlySet<SourceReliabilityClass> = new Set([
  "PRIMARY",
  "TRADE",
  "AGGREGATOR",
  "SPECIALIST",
  "ESTABLISHED_ENTERTAINMENT_MEDIA",
])

/** Trade / aggregator / specialist / primary / priority — safe Original sources. */
export function isTrustedOriginalSource(handle: string | null | undefined): boolean {
  if (isPriorityAuthor(handle)) return true
  return TRUSTED_ORIGINAL_SOURCE_CLASSES.has(classifySourceReliability(handle))
}

export function classifyDistributionPriority(
  handle: string | null | undefined,
): DistributionPriority {
  const rank = distributionRank(handle)
  if (rank >= 4) return "HIGH"
  if (rank >= 2) return "MEDIUM"
  if (isPriorityAuthor(handle)) return "LOW"
  return "NONE"
}

export function buildSourceProvenance(input: {
  handle?: string | null
  externalId?: string | null
  sourceUrl?: string | null
  observedAt?: string
  laterCorrectionObserved?: boolean
}): SourceProvenance {
  const handle = normalizeHandle(input.handle) || null
  const reliability = classifySourceReliability(handle)
  const distributionPriority = classifyDistributionPriority(handle)
  const rank = distributionRank(handle)
  return {
    handle,
    sourceCategory: reliability,
    distributionPriority,
    distributionRank: rank,
    reliabilityClass: reliability,
    isPrimary: reliability === "PRIMARY",
    isAggregator: reliability === "AGGREGATOR",
    observedAt: input.observedAt ?? new Date().toISOString(),
    sourceUrl: input.sourceUrl ?? null,
    sourcePostId: input.externalId ?? null,
    corroborated: false,
    laterCorrectionObserved: Boolean(input.laterCorrectionObserved),
  }
}

function claimId(...parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16)
}

function extractMovieTitlesFromText(text: string): string[] {
  const titles: string[] = []
  // Quoted titles
  for (const m of text.matchAll(/['""]([^'""]{2,80})['""]/g)) {
    if (m[1]) titles.push(m[1].trim())
  }
  // ALL CAPS franchise-ish phrases
  for (const m of text.matchAll(/\b([A-Z][A-Z0-9:&'\- ]{3,60})\b/g)) {
    const t = m[1]?.trim()
    if (t && t.split(/\s+/).length >= 2) titles.push(t)
  }
  return [...new Set(titles)].slice(0, 6)
}

/**
 * Build provenance claims + evidence from inbound text + ActorRating facts.
 * Deterministic — no LLM.
 */
export type CorroborationInput = {
  handle: string
  text: string
  observedAt?: string
  /** When true, this evidence asserts NOT X for overlapping claims. */
  contradicts?: boolean
}

function isTrustedCorroborator(handle: string | null | undefined): boolean {
  const r = classifySourceReliability(handle)
  return r === "PRIMARY" || r === "TRADE"
}

/**
 * Build provenance claims + evidence from inbound text + ActorRating facts.
 * Deterministic — no LLM.
 */
export function buildEvidenceLayer(input: {
  text: string
  authorHandle?: string | null
  externalId?: string | null
  sourceUrl?: string | null
  entities: ExtractedEntities
  facts: ArieFact[]
  /** Optional later correction text attached to the same story. */
  corrections?: string[]
  /** Additional independent source observations (no crawler — caller-supplied). */
  corroborations?: CorroborationInput[]
  observedAt?: string
}): {
  source: SourceProvenance
  claims: ArieClaim[]
  evidence: EvidenceBundle
} {
  const observedAt = input.observedAt ?? new Date().toISOString()
  const corrections = input.corrections ?? []
  const corroborations = input.corroborations ?? []
  const correctionText = corrections.join("\n")
  const laterCorrection =
    Boolean(correctionText && CORRECTION_RE.test(correctionText)) ||
    CORRECTION_RE.test(input.text) ||
    corroborations.some((c) => c.contradicts || CORRECTION_RE.test(c.text))

  const trustedSupports = corroborations.filter(
    (c) => !c.contradicts && isTrustedCorroborator(c.handle) && (CASTING_JOIN_RE.test(c.text) || RETURN_RE.test(c.text)),
  )
  const trustedContradicts = corroborations.filter(
    (c) =>
      (c.contradicts || CORRECTION_RE.test(c.text)) &&
      (isTrustedCorroborator(c.handle) || Boolean(normalizeHandle(c.handle))),
  )

  const source = buildSourceProvenance({
    handle: input.authorHandle,
    externalId: input.externalId,
    sourceUrl: input.sourceUrl,
    observedAt,
    laterCorrectionObserved: laterCorrection,
  })
  source.corroborated = trustedSupports.length > 0

  const handle = source.handle
  const claims: ArieClaim[] = []

  // --- First-party ActorRating facts are VERIFIED ---
  for (const f of input.facts) {
    claims.push({
      id: claimId("ar", f.fact_id),
      subject: f.entity_refs[0] ?? "actorrating",
      predicate: f.type,
      object: String(f.value ?? f.text),
      status: "VERIFIED",
      provenance: "actorrating_db",
      confidence: 95,
      sourceType: "actorrating_db",
      sourceHandle: null,
      sourceUrl: null,
      observedAt: f.as_of,
      verifiedAt: f.as_of,
      corroborationCount: 1,
      contradictionCount: 0,
      text: f.text,
      requiresAttribution: false,
    })
  }

  // --- Resolved entity identities are VERIFIED (existence), not casting claims ---
  for (const a of input.entities.actors) {
    claims.push({
      id: claimId("id", "actor", a.id),
      subject: a.name,
      predicate: "entity_resolved",
      object: a.id,
      status: "VERIFIED",
      provenance: "actorrating_db",
      confidence: 90,
      sourceType: "actorrating_db",
      sourceHandle: null,
      sourceUrl: null,
      observedAt,
      verifiedAt: observedAt,
      corroborationCount: 1,
      contradictionCount: 0,
      text: `${a.name} is a resolved ActorRating actor entity.`,
      requiresAttribution: false,
    })
  }

  const reliability = source.reliabilityClass
  const baseReportedConfidence =
    reliability === "PRIMARY"
      ? 75
      : reliability === "TRADE"
        ? 70
        : reliability === "AGGREGATOR"
          ? 45
          : reliability === "ESTABLISHED_ENTERTAINMENT_MEDIA"
            ? 55
            : 35

  const castingSignal =
    CASTING_JOIN_RE.test(input.text) ||
    RETURN_RE.test(input.text) ||
    FRANCHISE_EXIT_RE.test(input.text)
  const primaryActor = input.entities.actors[0]

  if (castingSignal && primaryActor) {
    const titles = [
      ...input.entities.movies.map((m) => m.title),
      ...extractMovieTitlesFromText(input.text),
    ]
    const titleObj = titles[0] ?? "an upcoming project"
    let status: ClaimStatus = "REPORTED"
    let contradictionCount = 0
    const corroborationCount = trustedSupports.length
    let verifiedAt: string | null = null
    let confidence = baseReportedConfidence

    // Conflicting later evidence → CONTRADICTED (deterministic; LLM does not adjudicate).
    if (
      trustedContradicts.some(
        (c) =>
          c.contradicts ||
          /\b(will not|won't|not returning|not joining|denied)\b/i.test(c.text),
      )
    ) {
      status = "CONTRADICTED"
      contradictionCount = trustedContradicts.length || 1
      confidence = 20
    } else if (trustedSupports.length > 0) {
      // Independent PRIMARY/TRADE corroboration upgrades casting/return to VERIFIED.
      status = "VERIFIED"
      verifiedAt = trustedSupports[0]?.observedAt ?? observedAt
      confidence = Math.min(92, 70 + trustedSupports.length * 8)
    }

    claims.push({
      id: claimId("cast", primaryActor.id, titleObj),
      subject: primaryActor.name,
      predicate: FRANCHISE_EXIT_RE.test(input.text)
        ? "reported_franchise_exit"
        : RETURN_RE.test(input.text)
          ? "reported_return"
          : "reported_casting",
      object: titleObj,
      status,
      provenance: status === "VERIFIED" ? "system" : "source_assertion",
      confidence,
      sourceType: "inbound_event",
      sourceHandle: handle,
      sourceUrl: source.sourceUrl,
      observedAt,
      verifiedAt,
      corroborationCount,
      contradictionCount,
      text:
        status === "VERIFIED"
          ? `${primaryActor.name} casting/return involving ${titleObj} corroborated by trusted source(s).`
          : status === "CONTRADICTED"
            ? `${primaryActor.name} casting/return involving ${titleObj} is contradicted by later evidence.`
            : `${handle ?? "source"} reports ${primaryActor.name} casting/return involving ${titleObj}.`,
      requiresAttribution: status !== "VERIFIED",
    })
  }

  // Iron Spider / similar unverifiable costume-detail claims
  if (IRON_SPIDER_RE.test(input.text)) {
    let status: ClaimStatus = "UNVERIFIED"
    let contradictionCount = 0
    const costumeCorroborated = corroborations.some(
      (c) => !c.contradicts && isTrustedCorroborator(c.handle) && IRON_SPIDER_RE.test(c.text),
    )
    const costumeContradicted =
      laterCorrection ||
      (correctionText && /iron\s*spider/i.test(correctionText)) ||
      corroborations.some(
        (c) =>
          (c.contradicts || CORRECTION_RE.test(c.text)) &&
          (/iron\s*spider/i.test(c.text) || /iron\s*spider/i.test(correctionText)),
      )

    if (costumeContradicted) {
      status = "CONTRADICTED"
      contradictionCount = 1
    } else if (costumeCorroborated) {
      status = "REPORTED"
    }

    claims.push({
      id: claimId("costume", "iron_spider", handle ?? "unknown"),
      subject: primaryActor?.name ?? "actor",
      predicate: "costume_claim",
      object: "Iron Spider Suit",
      status,
      provenance: "source_assertion",
      confidence: status === "CONTRADICTED" ? 15 : status === "REPORTED" ? 40 : 25,
      sourceType: costumeContradicted ? "correction" : "inbound_event",
      sourceHandle: handle,
      sourceUrl: source.sourceUrl,
      observedAt,
      verifiedAt: null,
      corroborationCount: costumeCorroborated ? 1 : 0,
      contradictionCount,
      text: `${handle ?? "source"} mentions an Iron Spider Suit; no independent ActorRating verification.`,
      requiresAttribution: true,
    })
  }

  // Explicit "CONFIRMED" language from aggregator does not create VERIFIED status
  if (CONFIRMED_LANG_RE.test(input.text) && reliability === "AGGREGATOR") {
    claims.push({
      id: claimId("lang", "confirmed_caveat", handle ?? "unknown"),
      subject: handle ?? "source",
      predicate: "uses_confirmed_language",
      object: "inbound_tweet",
      status: "UNVERIFIED",
      provenance: "system",
      confidence: 40,
      sourceType: "system",
      sourceHandle: handle,
      sourceUrl: source.sourceUrl,
      observedAt,
      verifiedAt: null,
      corroborationCount: 0,
      contradictionCount: 0,
      text: "Aggregator used confirmation language; treat casting details as reported/unverified unless independently corroborated.",
      requiresAttribution: true,
    })
  }

  // Movie titles appearing only in source text without DB entity → not independently verified
  for (const title of extractMovieTitlesFromText(input.text)) {
    const inDb = input.entities.movies.some(
      (m) => m.title.toLowerCase() === title.toLowerCase(),
    )
    if (!inDb) {
      claims.push({
        id: claimId("title", title),
        subject: title,
        predicate: "movie_mentioned_in_source",
        object: "source_only",
        status: "REPORTED",
        provenance: "source_assertion",
        confidence: baseReportedConfidence - 5,
        sourceType: "inbound_event",
        sourceHandle: handle,
        sourceUrl: source.sourceUrl,
        observedAt,
        verifiedAt: null,
        corroborationCount: 0,
        contradictionCount: 0,
        text: `Movie title "${title}" appears in the inbound source only; not independently verified via ActorRating catalog.`,
        requiresAttribution: true,
      })
    }
  }

  // Surface explicit correction observations with timestamps (do not silently overwrite history).
  for (const corr of corrections) {
    if (!corr.trim()) continue
    claims.push({
      id: claimId("corr", corr.slice(0, 80)),
      subject: handle ?? "source",
      predicate: "later_correction",
      object: corr.slice(0, 200),
      status: CORRECTION_RE.test(corr) ? "CONTRADICTED" : "REPORTED",
      provenance: "source_assertion",
      confidence: 50,
      sourceType: "correction",
      sourceHandle: handle,
      sourceUrl: source.sourceUrl,
      observedAt,
      verifiedAt: null,
      corroborationCount: 0,
      contradictionCount: CORRECTION_RE.test(corr) ? 1 : 0,
      text: `Later observation: ${corr.slice(0, 240)}`,
      requiresAttribution: true,
    })
  }

  const evidence = packageEvidence(claims, source, input.text)
  return { source, claims, evidence }
}

export function packageEvidence(
  claims: ArieClaim[],
  source: SourceProvenance,
  sourceText?: string,
): EvidenceBundle {
  const confirmed = claims.filter((c) => c.status === "VERIFIED")
  const reported = claims.filter((c) => c.status === "REPORTED")
  const uncertain = claims.filter((c) => c.status === "UNVERIFIED" || c.status === "UNKNOWN")
  const contradicted = claims.filter((c) => c.status === "CONTRADICTED")

  const missingEvidence: string[] = []
  if (reported.some((c) => c.predicate.includes("casting") || c.predicate.includes("return"))) {
    missingEvidence.push("No primary/trade independent verification of casting/return claim in Context Package.")
  }
  if (uncertain.some((c) => c.predicate === "costume_claim") || contradicted.some((c) => c.predicate === "costume_claim")) {
    missingEvidence.push("No credible corroboration for costume/suit detail.")
  }

  const potentialConflicts = contradicted.map((c) => c.text)

  const factualConfidence = computeFactualConfidence(claims, source)
  const writerMode = selectWriterMode(claims, source, sourceText)

  return {
    confirmed,
    reported,
    uncertain,
    contradicted,
    sourceSummary: `${source.handle ? `@${source.handle}` : "unknown"} · reliability ${source.reliabilityClass} · distribution ${source.distributionPriority}`,
    confidenceSummary: `Factual confidence ${factualConfidence}/100 · writerMode ${writerMode}`,
    missingEvidence,
    potentialConflicts,
    factualConfidence,
    writerMode,
  }
}

export function computeFactualConfidence(
  claims: ArieClaim[],
  source?: SourceProvenance,
): number {
  if (!claims.length) return 40
  const weights = { VERIFIED: 1, REPORTED: 0.45, UNVERIFIED: 0.2, CONTRADICTED: 0, UNKNOWN: 0.25 }
  // Weight event claims more than identity facts
  let num = 0
  let den = 0
  for (const c of claims) {
    const w =
      c.provenance === "actorrating_db" && c.predicate === "entity_resolved"
        ? 0.35
        : c.provenance === "actorrating_db"
          ? 1.2
          : 1
    num += weights[c.status] * c.confidence * w
    den += 100 * w
  }
  let score = Math.max(0, Math.min(100, Math.round((num / Math.max(1, den)) * 100)))

  const eventClaims = claims.filter(
    (c) =>
      c.provenance === "source_assertion" &&
      (c.predicate.includes("casting") ||
        c.predicate.includes("return") ||
        c.predicate.includes("franchise_exit") ||
        c.predicate === "costume_claim"),
  )
  const hasVerifiedEvent = eventClaims.some((c) => c.status === "VERIFIED")

  // Aggregators without independent corroboration must not score 90+ on news claims alone.
  if (
    source &&
    (source.reliabilityClass === "AGGREGATOR" ||
      source.reliabilityClass === "UNKNOWN" ||
      source.reliabilityClass === "FAN_ACCOUNT") &&
    !hasVerifiedEvent
  ) {
    score = Math.min(score, eventClaims.length > 0 ? 72 : 85)
  }

  return score
}

export function selectWriterMode(
  claims: ArieClaim[],
  source?: SourceProvenance,
  sourceText?: string,
): WriterEvidenceMode {
  const eventClaims = claims.filter(
    (c) =>
      c.provenance === "source_assertion" &&
      (c.predicate.includes("casting") ||
        c.predicate.includes("return") ||
        c.predicate.includes("franchise_exit") ||
        c.predicate === "costume_claim" ||
        c.predicate === "movie_mentioned_in_source"),
  )

  const unreliableSource =
    source &&
    (source.reliabilityClass === "AGGREGATOR" ||
      source.reliabilityClass === "UNKNOWN" ||
      source.reliabilityClass === "FAN_ACCOUNT")

  const newsLanguage =
    typeof sourceText === "string" &&
    /\b(reportedly|reports? that|officially confirms|confirmed|in talks|final time|final movie)\b/i.test(
      sourceText,
    )

  if (!eventClaims.length) {
    // Never upgrade aggregator-reported news to VERIFIED_EVENT without verified event claims.
    if (unreliableSource && newsLanguage) return "REPORTED_EVENT"
    return claims.some((c) => c.status === "VERIFIED" && c.provenance === "actorrating_db")
      ? "VERIFIED_EVENT"
      : "DISCUSSION"
  }
  if (eventClaims.some((c) => c.status === "CONTRADICTED" && c.predicate === "costume_claim")) {
    // Costume contradicted but return may still be reported
    if (eventClaims.some((c) => c.status === "REPORTED" && c.predicate !== "costume_claim")) {
      return "REPORTED_EVENT"
    }
    return "DISCUSSION"
  }
  if (unreliableSource && eventClaims.some((c) => c.status !== "VERIFIED")) {
    return "REPORTED_EVENT"
  }
  if (eventClaims.every((c) => c.status === "VERIFIED")) return "VERIFIED_EVENT"
  if (eventClaims.some((c) => c.status === "REPORTED")) return "REPORTED_EVENT"
  return "DISCUSSION"
}

export function draftHasAttribution(text: string): boolean {
  return ATTRIBUTION_RE.test(text) || /@\w+/i.test(text)
}

/**
 * Detect hard factual assertion of a reported/uncertain casting claim without attribution.
 */
export function findUnsupportedAssertions(
  draftText: string,
  claims: ArieClaim[],
): Array<{
  type: string
  severity: "HIGH" | "MEDIUM"
  claim: string
  status: ClaimStatus
  requiresAttribution: boolean
}> {
  const issues: Array<{
    type: string
    severity: "HIGH" | "MEDIUM"
    claim: string
    status: ClaimStatus
    requiresAttribution: boolean
  }> = []
  const text = draftText.trim()
  const attributed = draftHasAttribution(text)

  const hardFact =
    /\b(will return|returns as|is returning|has joined|joins|will star|will play|will don|dons the)\b/i.test(
      text,
    ) && !attributed

  for (const c of claims) {
    if (c.status === "VERIFIED") continue
    if (!c.requiresAttribution) continue

    // Costume claim
    if (c.predicate === "costume_claim" && IRON_SPIDER_RE.test(text)) {
      if (c.status === "CONTRADICTED" || c.status === "UNVERIFIED") {
        issues.push({
          type: c.status === "CONTRADICTED" ? "CONTRADICTED_ASSERTION" : "UNVERIFIED_ASSERTION",
          severity: "HIGH",
          claim: c.text,
          status: c.status,
          requiresAttribution: true,
        })
      } else if (c.status === "REPORTED" && !attributed) {
        issues.push({
          type: "UNVERIFIED_ASSERTION",
          severity: "HIGH",
          claim: c.text,
          status: c.status,
          requiresAttribution: true,
        })
      }
    }

    if (
      (c.predicate === "reported_return" || c.predicate === "reported_casting") &&
      hardFact
    ) {
      issues.push({
        type: "UNVERIFIED_ASSERTION",
        severity: "HIGH",
        claim: c.text,
        status: c.status,
        requiresAttribution: true,
      })
    }

    // Confirmed language without attribution when claims need it
    if (CONFIRMED_LANG_RE.test(text) && !attributed) {
      issues.push({
        type: "FAKE_CONFIRMATION",
        severity: "HIGH",
        claim: c.text,
        status: c.status,
        requiresAttribution: true,
      })
    }
  }

  // Dedupe by type+claim
  const seen = new Set<string>()
  return issues.filter((i) => {
    const k = `${i.type}:${i.claim}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Slim grounding surface for the writer LLM. */
export function slimEvidenceForWriter(pkg: ContextPackage) {
  const ev = pkg.evidence
  const src = pkg.sourceProvenance
  if (!ev || !src) return null
  return {
    writerMode: ev.writerMode,
    factualConfidence: ev.factualConfidence,
    source: {
      handle: src.handle,
      reliabilityClass: src.reliabilityClass,
      distributionPriority: src.distributionPriority,
    },
    confirmed: ev.confirmed.map((c) => ({ text: c.text, status: c.status })),
    reported: ev.reported.map((c) => ({
      text: c.text,
      status: c.status,
      requiresAttribution: c.requiresAttribution,
    })),
    uncertain: ev.uncertain.map((c) => ({ text: c.text, status: c.status })),
    contradicted: ev.contradicted.map((c) => ({ text: c.text, status: c.status })),
    missingEvidence: ev.missingEvidence,
    potentialConflicts: ev.potentialConflicts,
    rules: [
      "Never upgrade REPORTED/UNVERIFIED/CONTRADICTED into verified facts.",
      "Never invent ActorRating scores or relationships.",
      "Use attribution when stating a reported claim.",
      "Prefer confirmed ActorRating data + discussion over repeating uncertain news details.",
      "SOURCE CLAIM ≠ VERIFIED FACT.",
    ],
  }
}
