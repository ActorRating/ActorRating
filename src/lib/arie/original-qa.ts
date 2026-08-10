import { getGovernorSnapshot, governorAllowsOpportunity } from "@/lib/arie/cost-governor"
import { loadBrandConstitution } from "@/lib/arie/constitution"
import { groqJsonCompletion } from "@/lib/arie/groq"
import { loadAriePrompt } from "@/lib/arie/prompt-loader"
import {
  collectAllowedNumbers,
  findInventedNumbers,
} from "@/lib/arie/original-writer"
import type { ContextPackage } from "@/lib/arie/types"
import {
  ORIGINAL_QA_PROMPT_VERSION,
  X_ORIGINAL_MAX_CHARS,
  type DeterministicQaResult,
  type OriginalConcept,
  type OriginalDraft,
  type OriginalQaResult,
  type SemanticQaResult,
} from "@/lib/arie/original-types"
import { parseSemanticQaWithZod } from "@/lib/arie/original-schemas"
import { checkOriginalConstitution } from "@/lib/arie/original-constitution"

const FORBIDDEN = [
  /\[NO REPLY\]/i,
  /\[IGNORED/i,
  /you are an? ai/i,
  /as an language model/i,
  /brand constitution/i,
  /system prompt/i,
  /context package/i,
]

const FAKE_CONFIRM = /\b(confirmed|officially confirmed|breaking:? confirmed)\b/i
const EM_DASH = /\u2014|\u2013/

export function runDeterministicOriginalQa(input: {
  draft: OriginalDraft
  concept: OriginalConcept
  package: ContextPackage
  expiresAt?: Date | null
  dedupeDuplicate?: boolean
}): DeterministicQaResult {
  const errors: string[] = []
  const warnings: string[] = []
  const text = input.draft.text?.trim() ?? ""

  if (!text) errors.push("empty_draft")
  if (text.length > X_ORIGINAL_MAX_CHARS) errors.push("over_280_chars")
  if (text.length < 20) errors.push("too_short")

  for (const re of FORBIDDEN) {
    if (re.test(text)) errors.push(`forbidden_pattern:${re.source}`)
  }

  if (EM_DASH.test(text)) warnings.push("em_dash_present")

  const hashCount = (text.match(/#/g) || []).length
  if (hashCount > 2) errors.push("excessive_hashtags")

  const mentionCount = (text.match(/@\w+/g) || []).length
  if (mentionCount > 2) warnings.push("many_mentions")

  if (FAKE_CONFIRM.test(text) && /rumou?r|report|allegedly|could|may/i.test(input.package.event.text)) {
    errors.push("fake_confirmation_language")
  }

  if (!input.concept.actorRatingAdvantage?.trim()) {
    errors.push("missing_actorrating_advantage")
  }

  if (/what do you think\??$/i.test(text.trim())) {
    warnings.push("generic_question_ending")
  }

  const allowed = collectAllowedNumbers(input.package)
  const invented = findInventedNumbers(text, allowed)
  if (invented.length) errors.push(`invented_numbers:${invented.join(",")}`)

  // Decimal abuse: more than 1 decimal place on ratings-looking numbers
  if (/\b\d+\.\d{2,}\b/.test(text)) warnings.push("excess_decimal_places")

  for (const link of input.draft.links) {
    try {
      const u = new URL(link.href)
      if (!u.protocol.startsWith("http")) errors.push(`invalid_url:${link.href}`)
    } catch {
      errors.push(`invalid_url:${link.href}`)
    }
  }

  if (input.expiresAt && input.expiresAt.getTime() < Date.now()) {
    errors.push("opportunity_expired")
  }

  if (input.dedupeDuplicate) errors.push("duplicate_opportunity")

  // Must not be pure paraphrase of event
  const eventNorm = normalize(input.package.event.text)
  const draftNorm = normalize(text)
  if (eventNorm.length > 40 && draftNorm.includes(eventNorm.slice(0, 60))) {
    errors.push("near_paraphrase_of_source")
  }

  if (!/\b(ActorRating|radar|performance|rank|score|craft|Screen Presence|Emotional)\b/i.test(text)) {
    warnings.push("weak_actorrating_signal_in_copy")
  }

  if (input.draft.visual?.eligible === false && input.draft.visual?.type !== "none") {
    warnings.push("visual_ineligible")
  }

  const constitution = checkOriginalConstitution(text)
  if (!constitution.passed) {
    for (const e of constitution.errors) errors.push(e)
  }
  for (const w of constitution.warnings) warnings.push(w)

  return { passed: errors.length === 0, errors, warnings }
}

export async function runSemanticOriginalQa(input: {
  draft: OriginalDraft
  concept: OriginalConcept
  package: ContextPackage
  originalScore: number
  bypassGovernor?: boolean
}): Promise<{ ok: true; result: SemanticQaResult; model: string } | { ok: false; reason: string }> {
  if (!input.bypassGovernor) {
    const snap = await getGovernorSnapshot(55)
    const gate = governorAllowsOpportunity(snap, {
      opportunityScore: input.originalScore,
      priorityAuthor: input.package.opportunity.priorityAuthor,
    })
    if (!gate.allowed) return { ok: false, reason: gate.reason }
  }

  const constitution = await loadBrandConstitution()
  let promptBody: string
  try {
    promptBody = await loadAriePrompt("original-qa/v1.0.md")
  } catch {
    promptBody = FALLBACK_QA
  }

  const system = [
    promptBody,
    "",
    "## Brand Constitution",
    constitution.text.slice(0, 4000),
    "",
    `Prompt version: ${ORIGINAL_QA_PROMPT_VERSION}`,
  ].join("\n")

  const user = JSON.stringify({
    draft: input.draft.text,
    concept: input.concept,
    facts: input.package.facts.slice(0, 20),
    event: input.package.event,
    coverage: input.package.coverage,
    instruction:
      "Evaluate against supplied context only. Never invent facts. Return JSON with passed, confidence, scores, errors, warnings, summary.",
  })

  const groq = await groqJsonCompletion({
    system,
    user,
    operation: "original_qa_v1",
  })
  if (!groq.ok) return { ok: false, reason: groq.reason }

  const validated = parseSemanticQaWithZod(groq.json)
  if (!validated.ok) return { ok: false, reason: validated.reason }
  const j = validated.data
  const scoresRaw = (j.scores ?? {}) as Record<string, number | undefined>
  const num = (k: string, fallback: number) => {
    const v = scoresRaw[k]
    return typeof v === "number" ? Math.max(0, Math.min(5, Number(v))) : fallback
  }

  const hallucinationRisk = num("hallucinationRisk", 3)
  const factualAccuracy = num("factualAccuracy", 3)
  const errors = [...(j.errors ?? [])]
  const warnings = [...(j.warnings ?? [])]

  // Hard fail on high hallucination or low factual accuracy — LLM cannot override factual bar
  let passed = Boolean(j.passed)
  if (factualAccuracy < 4) {
    passed = false
    if (!errors.includes("factual_accuracy_below_4")) errors.push("factual_accuracy_below_4")
  }
  if (hallucinationRisk >= 4) {
    passed = false
    if (!errors.includes("hallucination_risk_high")) errors.push("hallucination_risk_high")
  }

  const result: SemanticQaResult = {
    passed,
    confidence:
      typeof j.confidence === "number"
        ? Math.max(0, Math.min(100, Math.round(j.confidence)))
        : 50,
    scores: {
      factualAccuracy,
      relevance: num("relevance", 3),
      originality: num("originality", 3),
      insight: num("insight", 3),
      brandVoice: num("brandVoice", 3),
      discussionQuality: num("discussionQuality", 3),
      actorRatingAdvantage: num("actorRatingAdvantage", 3),
      hallucinationRisk,
    },
    errors,
    warnings,
    summary: typeof j.summary === "string" ? j.summary : "",
  }

  return { ok: true, result, model: groq.model }
}

export async function runOriginalQa(input: {
  draft: OriginalDraft
  concept: OriginalConcept
  package: ContextPackage
  originalScore: number
  expiresAt?: Date | null
  dedupeDuplicate?: boolean
  bypassGovernor?: boolean
  /** If deterministic fails, skip semantic to save budget. */
  skipSemanticOnDeterministicFail?: boolean
}): Promise<
  | { ok: true; qa: OriginalQaResult; model?: string }
  | { ok: false; reason: string; qa?: OriginalQaResult }
> {
  const deterministic = runDeterministicOriginalQa({
    draft: input.draft,
    concept: input.concept,
    package: input.package,
    expiresAt: input.expiresAt,
    dedupeDuplicate: input.dedupeDuplicate,
  })

  if (!deterministic.passed && input.skipSemanticOnDeterministicFail !== false) {
    const qa: OriginalQaResult = {
      deterministic,
      semantic: null,
      passed: false,
      ranAt: new Date().toISOString(),
    }
    return { ok: true, qa }
  }

  const semantic = await runSemanticOriginalQa({
    draft: input.draft,
    concept: input.concept,
    package: input.package,
    originalScore: input.originalScore,
    bypassGovernor: input.bypassGovernor,
  })

  if (!semantic.ok) {
    const qa: OriginalQaResult = {
      deterministic,
      semantic: null,
      passed: false,
      ranAt: new Date().toISOString(),
    }
    return { ok: false, reason: semantic.reason, qa }
  }

  const qa: OriginalQaResult = {
    deterministic,
    semantic: semantic.result,
    passed: deterministic.passed && semantic.result.passed,
    ranAt: new Date().toISOString(),
  }
  return { ok: true, qa, model: semantic.model }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

const FALLBACK_QA = `You are ARIE Original QA. Score 1-5: factualAccuracy, relevance, originality, insight, brandVoice, discussionQuality, actorRatingAdvantage, hallucinationRisk (higher = worse).
passed=true only if factualAccuracy>=4 and hallucinationRisk<=2 and content is ActorRating-native.
Return JSON: { passed, confidence, scores, errors[], warnings[], summary }`
