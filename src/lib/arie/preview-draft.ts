import { loadBrandConstitution } from "@/lib/arie/constitution"
import { groqJsonCompletion } from "@/lib/arie/groq"
import { arieLog } from "@/lib/arie/log"
import type { ContextPackage } from "@/lib/arie/types"

export type PreviewDraftResult =
  | {
      ok: true
      draft: {
        action: string
        confidence: number
        reason: string
        reply: string
        claims: Array<{ span: string; fact_id: string }>
        prompt_version: string
      }
      opportunityScore: number
      contextPackageId: string
    }
  | { ok: false; reason: string }

/**
 * Sprint 2 validation hook: Context Package → Groq draft (no publish).
 * Agents must only use facts from the package.
 */
export async function previewReplyDraft(pkg: ContextPackage): Promise<PreviewDraftResult> {
  if (pkg.opportunity.decision === "ignore") {
    return { ok: false, reason: "opportunity_ignored" }
  }

  const constitution = await loadBrandConstitution()
  const system = [
    "You write ActorRating X reply drafts.",
    "You MUST obey the Brand Constitution below.",
    "You may ONLY assert numeric or catalog facts that appear in context.facts (use their fact_id in claims).",
    "Return STRICT JSON with keys: action, confidence (0-100), reason, reply, claims (array of {span, fact_id}).",
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
      facts: pkg.facts,
      links: pkg.links.slice(0, 4),
      currentTrend: pkg.currentTrend,
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
  const reply = typeof raw.reply === "string" ? raw.reply.trim() : ""
  if (!reply) return { ok: false, reason: "empty_reply" }

  const claims = Array.isArray(raw.claims)
    ? (raw.claims as Array<{ span?: string; fact_id?: string }>)
        .filter((c) => c && typeof c.fact_id === "string")
        .map((c) => ({ span: String(c.span ?? ""), fact_id: String(c.fact_id) }))
    : []

  const confidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
      : 0

  return {
    ok: true,
    draft: {
      action: typeof raw.action === "string" ? raw.action : "reply",
      confidence,
      reason: typeof raw.reason === "string" ? raw.reason : "",
      reply,
      claims,
      prompt_version: "reply-writer@preview-0.1",
    },
    opportunityScore: pkg.opportunity.score,
    contextPackageId: pkg.package_id,
  }
}
