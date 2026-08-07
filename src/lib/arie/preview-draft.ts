import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { loadBrandConstitution } from "@/lib/arie/constitution"
import { groqJsonCompletion } from "@/lib/arie/groq"
import { arieLog } from "@/lib/arie/log"
import type { ArieFact, ContextPackage } from "@/lib/arie/types"

const PROMPT_VERSION = "reply-writer@preview-0.2"
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
    "If you cannot add ONE grounded ActorRating insight the parent tweet does not already say, use action=no_reply and reply=\"\".",
    "NEVER paraphrase the tweet as the whole reply.",
    "NEVER say anyone is \"in the ActorRating catalog\".",
    "NEVER invent film titles, casts, scores, or quotes.",
    "You may ONLY assert numeric or structured facts that appear in context.facts (cite fact_id in claims).",
    "Prefer radar / aggregate_score / collaboration facts tied to titles mentioned in the tweet.",
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

  if (!result.ok) {
    await arieLog("warn", "preview", "draft_failed", { reason: result.reason })
    return { ok: false, reason: result.reason }
  }

  const raw = result.json as Record<string, unknown>
  const modelReply = typeof raw.reply === "string" ? raw.reply.trim() : ""
  const claims = Array.isArray(raw.claims)
    ? (raw.claims as Array<{ span?: string; fact_id?: string }>)
        .filter((c) => c && typeof c.fact_id === "string")
        .map((c) => ({ span: String(c.span ?? ""), fact_id: String(c.fact_id) }))
    : []

  const resolved = resolveDraftAction({
    modelAction: typeof raw.action === "string" ? raw.action : "reply",
    reply: modelReply,
    claims,
    facts: pkg.facts,
    sourceText: pkg.event.text,
  })

  const modelConfidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
      : 0
  const confidence = resolved.action === "no_reply" ? Math.min(modelConfidence, 40) : modelConfidence

  const draft = {
    action: resolved.action,
    confidence,
    reason:
      resolved.action === "no_reply"
        ? `${typeof raw.reason === "string" ? raw.reason : ""} [${resolved.reason}]`.trim()
        : typeof raw.reason === "string"
          ? raw.reason
          : "",
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
      model: `groq/${result.model}`,
      generationMs: result.generationMs,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
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
    model: `groq/${result.model}`,
    generationMs: result.generationMs,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
  }
}
