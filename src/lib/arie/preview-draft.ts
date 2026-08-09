import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { loadBrandConstitution } from "@/lib/arie/constitution"
import { groqJsonCompletion } from "@/lib/arie/groq"
import { arieLog } from "@/lib/arie/log"
import {
  asScoreNumber,
  formatPriorWorkReply,
  pickPriorWorkFact,
} from "@/lib/arie/prior-work"
import type { ArieFact, ContextPackage } from "@/lib/arie/types"

const PROMPT_VERSION = "reply-writer@preview-0.6"
export const NO_REPLY_TEXT = "[NO REPLY]"

const GROUNDING_FACT_TYPES = new Set([
  "radar_dim",
  "aggregate_score",
  "rating_count",
  "collaboration",
  "year",
  "director",
  "cast",
])

export type PreviewDraftResult =
  | {
      ok: true
      previewId: string
      draft: {
        action: string
        confidence: number
        reason: string
        reply: string
        claims: Array<{ span: string; fact_id: string }>
        prompt_version: string
      }
      opportunityScore: number
      coveragePercent: number
      coverage: ContextPackage["coverage"]
      contextPackageId: string
      model: string
      generationMs: number
      promptTokens: number
      completionTokens: number
    }
  | { ok: false; reason: string }

/** Prefer silence over paraphrase / ungrounded catalog spam (Batch-2 writer fix). */
export function resolveDraftAction(input: {
  modelAction: string
  reply: string
  claims: Array<{ fact_id: string }>
  facts: ArieFact[]
  sourceText: string
}): { action: "reply" | "no_reply"; reply: string; reason: string } {
  const factIds = new Set(input.facts.map((f) => f.fact_id))
  const validClaims = input.claims.filter((c) => factIds.has(c.fact_id))
  const groundingFacts = input.facts.filter((f) => GROUNDING_FACT_TYPES.has(f.type))
  const reply = input.reply.trim()

  if (input.modelAction === "no_reply" || !reply) {
    return { action: "no_reply", reply: NO_REPLY_TEXT, reason: "model_or_empty" }
  }

  if (/actorrating catalog/i.test(reply)) {
    return { action: "no_reply", reply: NO_REPLY_TEXT, reason: "catalog_promo" }
  }

  if (
    /curious how that (craft )?translates/i.test(reply) ||
    /solid craft context for this casting talk/i.test(reply)
  ) {
    return { action: "no_reply", reply: NO_REPLY_TEXT, reason: "stock_phrase" }
  }

  if (isNearParaphrase(input.sourceText, reply)) {
    return { action: "no_reply", reply: NO_REPLY_TEXT, reason: "tautology" }
  }

  if (groundingFacts.length === 0) {
    return { action: "no_reply", reply: NO_REPLY_TEXT, reason: "no_grounding_facts" }
  }

  if (validClaims.length === 0) {
    return { action: "no_reply", reply: NO_REPLY_TEXT, reason: "ungrounded_reply" }
  }

  return { action: "reply", reply, reason: "grounded" }
}

/**
 * Deterministic casting reply from a Prior work fact when the LLM refuses or fails grounding.
 */
export function buildPriorWorkFallback(
  facts: ArieFact[],
  sourceText = "",
): {
  reply: string
  claims: Array<{ span: string; fact_id: string }>
  reason: string
} | null {
  const prior = pickPriorWorkFact(facts, sourceText)
  if (!prior) return null
  const score = asScoreNumber(prior.value)
  if (score == null) return null

  const m = prior.text.match(/^Prior work — (.+?) in (.+?) \((\d+)\): aggregate/i)
  if (!m) return null
  const [, name, movie, year] = m
  const reply = formatPriorWorkReply({
    name,
    movie,
    year,
    score,
    seed: `${sourceText}|${prior.fact_id}`,
  })
  return {
    reply,
    claims: [{ span: `${score}/10`, fact_id: prior.fact_id }],
    reason: "prior_work_fallback",
  }
}

function isNearParaphrase(source: string, reply: string): boolean {
  const srcTokens = tokenize(source)
  const repTokens = tokenize(reply)
  if (repTokens.length < 4) return false
  const srcSet = new Set(srcTokens)
  const overlap = repTokens.filter((t) => srcSet.has(t)).length
  return overlap / repTokens.length >= 0.72
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

/**
 * Sprint 2 validation: Context Package → Groq draft → persist eval row (no publish).
 */
export async function previewReplyDraft(
  pkg: ContextPackage,
  opts: { inboundEventId?: string | null } = {},
): Promise<PreviewDraftResult> {
  if (pkg.opportunity.decision === "ignore") {
    return { ok: false, reason: "opportunity_ignored" }
  }

  let constitution: { version: string; text: string }
  try {
    constitution = await loadBrandConstitution()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await arieLog("error", "preview", "constitution_load_failed", { error: msg })
    return {
      ok: false,
      reason: msg.startsWith("constitution_missing") ? msg : `constitution_missing: ${msg}`,
    }
  }

  const system = [
    "You write ActorRating X reply drafts.",
    "You MUST obey the Brand Constitution below.",
    "Return STRICT JSON with keys: action, confidence (0-100), reason, reply, claims.",
    'action must be \"reply\" or \"no_reply\".',
    "If context.facts includes Prior work aggregates on casting_news, you SHOULD reply using one — do not choose no_reply just because the new film lacks a score.",
    "Write a DISTINCT craft-first sentence each time.",
    "Forbidden stock phrases: \"curious how that craft translates here\", \"curious how that translates\", \"solid craft context for this casting talk\".",
    "Vary structure — do not always open with \"prior work in\" or \"[Name]'s [Film] is\". Prefer specific film + score + casting context.",
    "When multiple Prior work facts exist, prefer the one thematically closest to the tweet (franchise, tone, genre) over the highest score alone.",
    "If you truly have zero usable facts, use action=no_reply and reply=\"\".",
    "NEVER paraphrase the tweet as the whole reply.",
    "NEVER say anyone is \"in the ActorRating catalog\".",
    "NEVER invent film titles, casts, scores, or quotes.",
    "You may ONLY assert numeric or structured facts that appear in context.facts (cite fact_id in claims).",
    "On casting_news: cite a Prior work aggregate and frame it as prior craft — never as a score for the new unreleased role.",
    "Tone: craft-first, curious, never promotional CTAs.",
    "Prefer under 240 characters when possible; max 280.",
    "",
    "=== BRAND CONSTITUTION ===",
    constitution.text.slice(0, 6000),
  ].join("\n")

  const user = JSON.stringify(
    {
      event: pkg.event,
      opportunity: pkg.opportunity,
      actor: pkg.actor,
      movie: pkg.movie,
      director: pkg.director,
      radar: pkg.radar,
      communityRating: pkg.communityRating,
      topPerformances: pkg.topPerformances.slice(0, 5),
      relatedPerformances: pkg.relatedPerformances.slice(0, 4),
      facts: pkg.facts,
      links: pkg.links.slice(0, 4),
      currentTrend: pkg.currentTrend,
      coverage: pkg.coverage,
    },
    null,
    0,
  )

  const result = await groqJsonCompletion({
    operation: "preview_reply_draft",
    system,
    user: `Context package (authoritative):\n${user}`,
  })

  let model = "none"
  let generationMs = 0
  let promptTokens = 0
  let completionTokens = 0
  let resolved: { action: "reply" | "no_reply"; reply: string; reason: string }
  let claims: Array<{ span: string; fact_id: string }> = []
  let confidence = 0
  let draftReason = ""

  if (!result.ok) {
    await arieLog("warn", "preview", "draft_failed", { reason: result.reason })
    const fallback = buildPriorWorkFallback(pkg.facts, pkg.event.text)
    if (!fallback) return { ok: false, reason: result.reason }
    resolved = { action: "reply", reply: fallback.reply, reason: `${fallback.reason}_after_${result.reason}` }
    claims = fallback.claims
    confidence = 55
    draftReason = resolved.reason
    model = "fallback/prior-work"
  } else {
    model = `groq/${result.model}`
    generationMs = result.generationMs
    promptTokens = result.usage.promptTokens
    completionTokens = result.usage.completionTokens

    const raw = result.json as Record<string, unknown>
    const modelReply = typeof raw.reply === "string" ? raw.reply.trim() : ""
    claims = Array.isArray(raw.claims)
      ? (raw.claims as Array<{ span?: string; fact_id?: string }>)
          .filter((c) => c && typeof c.fact_id === "string")
          .map((c) => ({ span: String(c.span ?? ""), fact_id: String(c.fact_id) }))
      : []

    resolved = resolveDraftAction({
      modelAction: typeof raw.action === "string" ? raw.action : "reply",
      reply: modelReply,
      claims,
      facts: pkg.facts,
      sourceText: pkg.event.text,
    })

    if (resolved.action === "no_reply") {
      const fallback = buildPriorWorkFallback(pkg.facts, pkg.event.text)
      if (fallback) {
        resolved = { action: "reply", reply: fallback.reply, reason: fallback.reason }
        claims = fallback.claims
        confidence = 60
        draftReason = fallback.reason
      }
    }

    if (resolved.action === "reply" && !draftReason) {
      const modelConfidence =
        typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
          ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
          : 0
      confidence = modelConfidence
      draftReason = typeof raw.reason === "string" ? raw.reason : resolved.reason
    } else if (resolved.action === "no_reply") {
      confidence = Math.min(
        typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
          ? Math.round(raw.confidence)
          : 0,
        40,
      )
      draftReason = `${typeof raw.reason === "string" ? raw.reason : ""} [${resolved.reason}]`.trim()
    }
  }

  const draft = {
    action: resolved.action,
    confidence,
    reason: draftReason,
    reply: resolved.reply,
    claims: resolved.action === "reply" ? claims : [],
    prompt_version: PROMPT_VERSION,
  }

  const row = await prisma.ariePreviewEval.create({
    data: {
      inboundEventId: opts.inboundEventId ?? null,
      sourceText: pkg.event.text,
      authorHandle: pkg.event.author_handle ?? null,
      opportunityScore: pkg.opportunity.score,
      coveragePercent: pkg.coverage.percent,
      coverage: pkg.coverage as unknown as Prisma.InputJsonValue,
      contextPackage: pkg as unknown as Prisma.InputJsonValue,
      draftText: draft.reply,
      draftJson: draft as unknown as Prisma.InputJsonValue,
      confidence,
      promptVersion: PROMPT_VERSION,
      model,
      generationMs,
      promptTokens,
      completionTokens,
    },
  })

  await arieLog("info", "preview", "draft_saved", {
    previewId: row.id,
    opportunityScore: pkg.opportunity.score,
    coveragePercent: pkg.coverage.percent,
    confidence,
    action: resolved.action,
    resolveReason: resolved.reason,
  })

  return {
    ok: true,
    previewId: row.id,
    draft,
    opportunityScore: pkg.opportunity.score,
    coveragePercent: pkg.coverage.percent,
    coverage: pkg.coverage,
    contextPackageId: pkg.package_id,
    model,
    generationMs,
    promptTokens,
    completionTokens,
  }
}
