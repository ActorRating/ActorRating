import { getGovernorSnapshot, governorAllowsOpportunity } from "@/lib/arie/cost-governor"
import { loadBrandConstitution } from "@/lib/arie/constitution"
import { groqJsonCompletion } from "@/lib/arie/groq"
import { arieLog } from "@/lib/arie/log"
import { buildVisualSpec } from "@/lib/arie/original-visual"
import { loadAriePrompt } from "@/lib/arie/prompt-loader"
import type { ContextPackage } from "@/lib/arie/types"
import {
  ORIGINAL_WRITER_PROMPT_VERSION,
  X_ORIGINAL_MAX_CHARS,
  type OriginalConcept,
  type OriginalDraft,
  type OriginalScoreResult,
  type VisualSpec,
} from "@/lib/arie/original-types"
import { parseDraftWithZod } from "@/lib/arie/original-schemas"

export async function generateOriginalDraft(input: {
  package: ContextPackage
  concept: OriginalConcept
  originalScore: OriginalScoreResult
  bypassGovernor?: boolean
}): Promise<
  | {
      ok: true
      draft: OriginalDraft
      visual: VisualSpec
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
    if (!gate.allowed) return { ok: false, reason: gate.reason }
  }

  const visual = buildVisualSpec({
    concept: input.concept,
    package: input.package,
  })

  const constitution = await loadBrandConstitution()
  let promptBody: string
  try {
    promptBody = await loadAriePrompt("original-writer/v1.0.md")
  } catch {
    promptBody = FALLBACK_WRITER
  }

  const system = [
    promptBody,
    "",
    "## Brand Constitution",
    constitution.text.slice(0, 6000),
    "",
    `Prompt version: ${ORIGINAL_WRITER_PROMPT_VERSION}`,
    `Hard max characters: ${X_ORIGINAL_MAX_CHARS}`,
  ].join("\n")

  const allowedNumbers = collectAllowedNumbers(input.package)

  const user = JSON.stringify({
    instruction:
      "Write ONE original X post from the selected concept + context. JSON: { text, confidence, claims[], entities[] }. Only use numbers from allowedNumbers. No news paraphrase. End with a specific discussion question when natural.",
    concept: input.concept,
    visualSpec: visual,
    allowedNumbers,
    context: {
      event: input.package.event,
      actor: input.package.actor,
      actors: input.package.actors,
      movie: input.package.movie,
      director: input.package.director,
      radar: input.package.radar,
      topPerformances: input.package.topPerformances.slice(0, 6),
      facts: input.package.facts.slice(0, 16),
      links: input.package.links.slice(0, 6),
      coverage: input.package.coverage,
    },
  })

  const result = await groqJsonCompletion({
    system,
    user,
    operation: "original_writer_v1",
  })
  if (!result.ok) return { ok: false, reason: result.reason }

  const json = result.json
  const validated = parseDraftWithZod(json)
  if (!validated.ok) {
    return { ok: false, reason: validated.reason }
  }

  let text = validated.data.text.trim()
  // Strip wrapping quotes
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim()
  }

  const invented = findInventedNumbers(text, allowedNumbers)
  if (invented.length) {
    await arieLog("warn", "original", "writer_invented_numbers", { invented })
    return { ok: false, reason: `invented_numbers:${invented.slice(0, 3).join(",")}` }
  }

  if (text.length > X_ORIGINAL_MAX_CHARS) {
    // Soft trim at last sentence boundary under limit
    const truncated = text.slice(0, X_ORIGINAL_MAX_CHARS - 1)
    const cut = Math.max(truncated.lastIndexOf("?"), truncated.lastIndexOf("."), truncated.lastIndexOf("!"))
    text = (cut > 80 ? truncated.slice(0, cut + 1) : truncated).trim()
  }

  const draft: OriginalDraft = {
    text,
    visual,
    entities: (validated.data.entities ?? []).filter((e) => e.name),
    links: input.package.links.slice(0, 4),
    sourceReferences: [
      {
        kind: "event_text",
        value: input.package.event.text.slice(0, 280),
      },
      ...(input.package.event.external_id
        ? [{ kind: "source_post_id", value: String(input.package.event.external_id) }]
        : []),
      ...(input.package.event.author_handle
        ? [{ kind: "source_account", value: input.package.event.author_handle }]
        : []),
    ],
    confidence:
      typeof validated.data.confidence === "number"
        ? Math.max(0, Math.min(100, Math.round(validated.data.confidence)))
        : 60,
    claims: validated.data.claims ?? [],
  }

  return {
    ok: true,
    draft,
    visual,
    model: result.model,
    promptVersion: ORIGINAL_WRITER_PROMPT_VERSION,
    usage: result.usage,
    generationMs: result.generationMs,
  }
}

export function collectAllowedNumbers(pkg: ContextPackage): number[] {
  const nums = new Set<number>()
  const add = (n: unknown) => {
    if (typeof n === "number" && Number.isFinite(n)) {
      nums.add(n)
      // also allow one-decimal display forms
      nums.add(Math.round(n * 10) / 10)
    }
  }
  for (const f of pkg.facts) add(f.value)
  for (const p of pkg.topPerformances) {
    add(p.seededAggregate)
    add(p.ratingCount)
    add(p.movieYear)
  }
  if (pkg.radar) {
    for (const v of Object.values(pkg.radar.dimensions)) add(v)
    add(pkg.radar.seededAggregate)
  }
  if (pkg.communityRating) {
    add(pkg.communityRating.avg10)
    add(pkg.communityRating.ratingCount)
  }
  if (pkg.movie?.year) add(pkg.movie.year)
  return [...nums]
}

/** Detect numeric literals in draft that are not in allowed set (tolerance for ints). */
export function findInventedNumbers(text: string, allowed: number[]): string[] {
  const allowedSet = new Set(allowed.map((n) => Number(n.toFixed(4))))
  // Also allow integers that match floor of allowed decimals
  for (const n of [...allowed]) {
    allowedSet.add(Math.floor(n))
    allowedSet.add(Math.round(n))
  }
  const invented: string[] = []
  const re = /\b\d+(?:\.\d+)?\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const raw = m[0]
    // skip obvious years already in allowed; skip lonely "1" in #1 often OK if we allow 1
    const num = Number(raw)
    if (!Number.isFinite(num)) continue
    // Allow small ordinals commonly used in copy (#1–#10) without DB backing
    if (num >= 1 && num <= 10 && Number.isInteger(num)) continue
    // Allow character counts / percentages only if present
    if (allowedSet.has(num) || allowedSet.has(Number(num.toFixed(1)))) continue
    // year-looking without evidence
    invented.push(raw)
  }
  return [...new Set(invented)]
}

const FALLBACK_WRITER = `You are ARIE Original Writer for ActorRating (X/Twitter).
Write one concise original post (<=280 chars). Strong first line. Use only allowedNumbers. Invite a specific conversation question. No hashtag spam, no fake confirmed language, no invented stats.
Return JSON: { "text": "...", "confidence": 0-100, "claims": [], "entities": [] }`
