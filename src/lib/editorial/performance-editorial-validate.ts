import type { EditorialDraftSections } from "@/lib/editorial/performance-editorial-prompt"

const MIN_WORDS = 120
const MAX_WORDS = 320

const SPOILER_SOFT_PATTERNS = [
  /\btwist\b/i,
  /\bspoiler\b/i,
  /\bis killed\b/i,
  /\bgets killed\b/i,
  /\breveal(?:s|ed) that\b/i,
]

export function countWords(...parts: string[]): number {
  return parts
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export type EditorialValidationResult =
  | { ok: true; wordCount: number }
  | { ok: false; reason: string; wordCount: number }

export function validateEditorialDraft(draft: EditorialDraftSections): EditorialValidationResult {
  const sections = [draft.overview, draft.scoreAnalysis, draft.communityTake, draft.notableMoments]
  for (const s of sections) {
    if (!s || !s.trim()) {
      return { ok: false, reason: "Empty section", wordCount: 0 }
    }
  }

  const wordCount = countWords(...sections)
  if (wordCount < MIN_WORDS) {
    return { ok: false, reason: `Too short (${wordCount} words)`, wordCount }
  }
  if (wordCount > MAX_WORDS) {
    return { ok: false, reason: `Too long (${wordCount} words)`, wordCount }
  }

  const blob = sections.join(" ")
  for (const re of SPOILER_SOFT_PATTERNS) {
    if (re.test(blob)) {
      return { ok: false, reason: `Soft spoiler pattern matched: ${re}`, wordCount }
    }
  }

  return { ok: true, wordCount }
}

export function parseEditorialJson(raw: string): EditorialDraftSections | null {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const parsed = JSON.parse(cleaned) as Partial<EditorialDraftSections>
    if (
      typeof parsed.overview !== "string" ||
      typeof parsed.scoreAnalysis !== "string" ||
      typeof parsed.communityTake !== "string" ||
      typeof parsed.notableMoments !== "string"
    ) {
      return null
    }
    return {
      overview: parsed.overview.trim(),
      scoreAnalysis: parsed.scoreAnalysis.trim(),
      communityTake: parsed.communityTake.trim(),
      notableMoments: parsed.notableMoments.trim(),
    }
  } catch {
    return null
  }
}
