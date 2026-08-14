/**
 * Source title mention roles — event vs historical vs ambiguous.
 * Cheap deterministic heuristics (no NLP / external API).
 *
 * Used to keep casting/return claims and primaryMovie bound to the
 * current source event, not filmography background.
 */

export type TitleMentionRole = "event" | "historical" | "ambiguous"

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function findTitleSpans(text: string, title: string): Array<{ start: number; end: number }> {
  const needle = title.trim()
  if (needle.length < 3) return []
  const spans: Array<{ start: number; end: number }> = []
  const wordish = new RegExp(`\\b${escapeRegExp(needle)}\\b`, "gi")
  let m: RegExpExecArray | null
  while ((m = wordish.exec(text)) !== null) {
    spans.push({ start: m.index, end: m.index + m[0].length })
  }
  if (spans.length) return spans
  // Fallback for titles with punctuation / apostrophes that break \\b
  const lower = text.toLowerCase()
  const n = needle.toLowerCase()
  let idx = 0
  while ((idx = lower.indexOf(n, idx)) >= 0) {
    spans.push({ start: idx, end: idx + needle.length })
    idx += needle.length
  }
  return spans
}

const WINDOW = 72

/** Historical / prior-role framing around a title mention. */
const HISTORICAL_LEFT_RE =
  /\b(?:(?:her|his|their|the)\s+)?(?:performance|role|turn|work|appearance|portrayal)\s+(?:as\s+[\w'’.-]+(?:\s+[\w'’.-]+){0,3}\s+)?(?:in|from)\s*$/i
const HISTORICAL_AS_IN_RE =
  /\bas\s+[\w'’.-]+(?:\s+[\w'’.-]+){0,4}\s+in\s*$/i
const HISTORICAL_LEFT_GENERIC_RE =
  /\b(?:previously|formerly|past|earlier|once|already|known\s+for|famous\s+for|remembered\s+for|who\s+played|who\s+starred|starred\s+in|appeared\s+in|played\s+(?:in|the)|prior\s+work(?:\s+in)?)\s*$/i
const HISTORICAL_RIGHT_RE =
  /^\s*(?:\(\d{4}\))?(?:\s*[,:]?\s*(?:fame|era|days|role|performance|cast(?:ing)?))?/i

/** Current-event framing around a title mention. */
const EVENT_LEFT_RE =
  /\b(?:(?:will\s+)?(?:return(?:ing)?|reprise|reprising)|(?:set\s+to\s+)?return|coming\s+back|back\s+as|(?:will\s+)?(?:join|joins|joining)|(?:has\s+been\s+)?(?:cast|casting)|(?:officially\s+)?cast|(?:will\s+)?(?:star|play|appear)|set\s+to\s+(?:star|play)|boards?|tapped|in\s+talks(?:\s+to)?|casting\s+(?:news|controversy|backlash|debate|row)?(?:\s+(?:over|for|about|around))?|(?:official\s+)?(?:trailer|teaser)|first\s+look|premiere|releases?|opens?)\b[\s\S]{0,40}$/i
const EVENT_RIGHT_RE =
  /^\s*(?:trailer|teaser|sequel|prequel|casting|cast|returns?|returning|joins?|starring|stars|premiere|release)/i
const EVENT_RETURN_TO_RE =
  /\b(?:returns?|returning|will\s+return|set\s+to\s+return|reprises?|coming\s+back)\s+(?:to|as|in)\s*$/i
const EVENT_FOR_TITLE_RE =
  /\b(?:trailer|teaser|first\s+look|casting|cast|controversy|backlash)\s+(?:for|of|about|around|over)\s+(?:[\w'’.-]+\s+){0,4}$/i

function roleAtSpan(text: string, span: { start: number; end: number }): TitleMentionRole {
  const left = text.slice(Math.max(0, span.start - WINDOW), span.start)
  const right = text.slice(span.end, span.end + WINDOW)
  const nearLeft = left.slice(-52)

  // Current return/cast/trailer framing wins. Important: "will return as X in Title"
  // must NOT be treated as historical "as Role in Title".
  const event =
    EVENT_RETURN_TO_RE.test(nearLeft) ||
    EVENT_FOR_TITLE_RE.test(nearLeft) ||
    EVENT_LEFT_RE.test(nearLeft) ||
    EVENT_RIGHT_RE.test(right) ||
    /\b(?:will\s+)?(?:return(?:ing|s)?|reprise|reprising|join(?:s|ing)?|cast)\b/i.test(nearLeft)

  if (event) return "event"

  const historical =
    HISTORICAL_LEFT_RE.test(nearLeft) ||
    HISTORICAL_AS_IN_RE.test(nearLeft) ||
    HISTORICAL_LEFT_GENERIC_RE.test(nearLeft) ||
    (/\b(?:performance|role)\b/i.test(nearLeft) && /\bin\s*$/i.test(nearLeft))

  if (historical) return "historical"
  void HISTORICAL_RIGHT_RE
  return "ambiguous"
}

/**
 * Classify how `title` is used in `text`.
 * If multiple spans exist, prefer event > ambiguous > historical
 * (a title can be both background and the news — event wins).
 */
export function classifyTitleMentionRole(text: string, title: string): TitleMentionRole {
  const spans = findTitleSpans(text, title)
  if (!spans.length) return "ambiguous"

  let sawEvent = false
  let sawAmbiguous = false
  let sawHistorical = false
  for (const span of spans) {
    const role = roleAtSpan(text, span)
    if (role === "event") sawEvent = true
    else if (role === "ambiguous") sawAmbiguous = true
    else sawHistorical = true
  }
  if (sawEvent) return "event"
  if (sawAmbiguous && !sawHistorical) return "ambiguous"
  if (sawHistorical && !sawAmbiguous) return "historical"
  // Mix of historical + ambiguous without event → treat as historical for safety
  if (sawHistorical) return "historical"
  return "ambiguous"
}

/** Prefer an event-role title; never prefer a purely historical one. */
export function pickSourceEventTitle(
  text: string,
  titles: string[],
): { title: string; role: TitleMentionRole } | null {
  const unique = [...new Set(titles.map((t) => t.trim()).filter((t) => t.length >= 3))]
  if (!unique.length) return null

  const ranked = unique.map((title) => ({
    title,
    role: classifyTitleMentionRole(text, title),
  }))

  const eventHit = ranked.find((r) => r.role === "event")
  if (eventHit) return eventHit

  const ambiguous = ranked.filter((r) => r.role === "ambiguous")
  if (ambiguous.length) {
    // Prefer longer / more specific ambiguous titles (Children of Blood and Bone > Film)
    ambiguous.sort((a, b) => b.title.length - a.title.length)
    return ambiguous[0]!
  }

  // All historical — no current-event title
  return null
}

/** Current-event assertion verbs/phrases in a draft. */
const DRAFT_EVENT_ASSERTION_RE =
  /\b(?:(?:will\s+)?return(?:ing|s)?|reprises?|coming\s+back|joins?|joining|has\s+joined|cast\s+as|is\s+cast|will\s+star|will\s+play|set\s+to\s+(?:star|play|return|join)|starring\s+in)\b/i

/**
 * Detect drafts that assert a current return/casting event about a title
 * that the source only mentions historically (or not as an event).
 * Attribution does NOT clear these issues.
 */
export function findSourceEventMismatches(
  draftText: string,
  sourceText: string,
  candidateTitles: string[],
): Array<{
  type: "SOURCE_EVENT_MISMATCH" | "HISTORICAL_AS_CURRENT_EVENT"
  title: string
  role: TitleMentionRole
  detail: string
}> {
  const draft = draftText.trim()
  if (!draft || !DRAFT_EVENT_ASSERTION_RE.test(draft)) return []

  const issues: Array<{
    type: "SOURCE_EVENT_MISMATCH" | "HISTORICAL_AS_CURRENT_EVENT"
    title: string
    role: TitleMentionRole
    detail: string
  }> = []
  const seen = new Set<string>()

  for (const raw of candidateTitles) {
    const title = raw.trim()
    if (title.length < 3) continue
    if (!new RegExp(escapeRegExp(title), "i").test(draft)) continue
    // Draft must couple the title with event-assertion language in a local window
    if (!draftAssertsCurrentEventAboutTitle(draft, title)) continue

    const role = classifyTitleMentionRole(sourceText, title)
    if (role === "event") continue

    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    if (role === "historical") {
      issues.push({
        type: "HISTORICAL_AS_CURRENT_EVENT",
        title,
        role,
        detail: `Draft asserts a current event about "${title}", but the source only mentions it historically.`,
      })
    } else {
      issues.push({
        type: "SOURCE_EVENT_MISMATCH",
        title,
        role,
        detail: `Draft asserts a current event about "${title}", but the source does not assert that title as the current event.`,
      })
    }
  }

  return issues
}

function draftAssertsCurrentEventAboutTitle(draft: string, title: string): boolean {
  const spans = findTitleSpans(draft, title)
  if (!spans.length) return false
  const LOCAL = 44
  for (const span of spans) {
    const left = draft.slice(Math.max(0, span.start - LOCAL), span.start)
    const right = draft.slice(span.end, span.end + 24)
    // Require the event verb to target this title locally — do not let a
    // return about Title A poison Title B later in the same sentence.
    if (EVENT_RETURN_TO_RE.test(left)) return true
    if (EVENT_FOR_TITLE_RE.test(left)) return true
    if (
      /\b(?:(?:will\s+)?return(?:ing|s)?|reprises?|coming\s+back|joins?|joining|has\s+joined|cast\s+as|is\s+cast|will\s+star|will\s+play|set\s+to\s+(?:star|play|return|join))\b/i.test(
        left,
      )
    ) {
      return true
    }
    if (/^\s*(?:returns?|returning|joins?|casting|cast|starring)/i.test(right)) return true
  }
  return false
}

/** Titles to check from package + draft for source-event QA. */
export function collectCandidateEventTitles(input: {
  sourceText: string
  draftText: string
  packageMovieTitle?: string | null
  entityMovieTitles?: string[]
  claimObjects?: string[]
}): string[] {
  const out: string[] = []
  const push = (t: string | null | undefined) => {
    const v = t?.trim()
    if (v && v.length >= 3) out.push(v)
  }
  push(input.packageMovieTitle)
  for (const t of input.entityMovieTitles ?? []) push(t)
  for (const t of input.claimObjects ?? []) push(t)
  // Quoted titles in source / draft
  for (const m of `${input.sourceText}\n${input.draftText}`.matchAll(/['"“”]([^'"“”]{2,80})['"“”]/g)) {
    push(m[1])
  }
  // ALL-CAPS multi-word phrases from source (franchise style)
  for (const m of input.sourceText.matchAll(/\b([A-Z][A-Z0-9:&'\- ]{3,60})\b/g)) {
    const t = m[1]?.trim()
    if (t && t.split(/\s+/).length >= 2) push(t)
  }
  // Title-case multi-word phrases from source that also appear in the draft
  // (e.g. "The Hunger Games" historical mention reused as a false return).
  const draftLower = input.draftText.toLowerCase()
  for (const m of input.sourceText.matchAll(
    /\b((?:The\s+)?[A-Z][\w'’.-]+(?:\s+(?:of|the|and|a|an|:)?\s*[A-Z][\w'’.-]+){0,6})\b/g,
  )) {
    const t = m[1]?.trim()
    if (t && t.split(/\s+/).length >= 2 && draftLower.includes(t.toLowerCase())) push(t)
  }
  for (const t of [...out]) {
    if (draftLower.includes(t.toLowerCase())) push(t)
  }
  return [...new Set(out)]
}
