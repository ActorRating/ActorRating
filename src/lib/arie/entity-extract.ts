import type { PrismaClient } from "@prisma/client"

export type ExtractedEntities = {
  actors: Array<{ id: string; name: string; slug: string | null; confidence: number }>
  movies: Array<{
    id: string
    title: string
    year: number
    slug: string | null
    director: string | null
    genre: string | null
    indexingCohort: number
    confidence: number
  }>
  directors: Array<{ name: string; confidence: number }>
  unresolved: Array<{ mention: string; reason: string }>
}

function normalize(s: string): string {
  return s.normalize("NFKD").replace(/\s+/g, " ").trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** English words that name the medium itself — not a title blacklist. */
const CINEMATIC_NOUN_TITLES = new Set([
  "film",
  "movie",
  "picture",
  "cinema",
  "feature",
  "short",
  "trailer",
  "sequel",
  "drama",
  "comedy",
  "horror",
  "thriller",
  "documentary",
  "series",
  "show",
  "episode",
  "scene",
  "cast",
  "screen",
])

/** Immediate right-hand tokens that make a short title a common-noun compound. */
const GENERIC_RIGHT_TOKEN =
  /^(country|countries|festival|festivals|fest|market|markets|industry|hub|program|programme|week|center|centre|institute|school|studies|commissioner|community|board|council|committee|forum|summit|expo|conference|group|team|maker|makers|making|contents?|news|update|updates|world)$/i

/** Left adjectives that only invalidate cinematic-noun titles ("international film"). */
const GENERIC_LEFT_FOR_NOUN =
  /^(international|independent|indie|asian|european|american|global|local|short|student|documentary|content|contents|feature)$/i

const WORK_LEFT_RE =
  /\b(?:official\s+)?(?:trailer|teaser|sequel|prequel|remake|reboot|starring|stars?\s+in|directed\s+by|reviews?\s+of|premiere(?:\s+of)?)\b/i

const WORK_RIGHT_RE =
  /\b(?:starring|stars|starred|trailer|teaser|sequel|prequel|directed|nominated|nomination|oscar|emmy|awards?|premiere|release|review|reviews)\b/i

const FILM_NOUN_BEFORE_RE = /(?:^|\b)(?:the\s+)?(?:\d{4}\s+)?(?:film|movie|picture)\s+$/i

type TitleSpan = { start: number; end: number }

export function isCinematicNounTitle(title: string): boolean {
  return CINEMATIC_NOUN_TITLES.has(title.trim().toLowerCase())
}

/** Short single-token titles (Focus, Film, CODA, Animals) need work-as-title evidence. */
export function needsStrongMovieTitleEvidence(title: string): boolean {
  const t = title.trim()
  if (isCinematicNounTitle(t)) return true
  return t.length < 8 && !/\s/.test(t)
}

function findWordOccurrences(text: string, title: string): TitleSpan[] {
  const needle = title.trim()
  if (needle.length < 4) return []
  const re = new RegExp(`\\b${escapeRegExp(needle)}\\b`, "gi")
  const hits: TitleSpan[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    hits.push({ start: m.index, end: m.index + m[0].length })
  }
  return hits
}

function adjacentToken(text: string, index: number, direction: "before" | "after"): string {
  if (direction === "after") {
    return text.slice(index).match(/^\s*\(?\s*([A-Za-z][A-Za-z0-9']*)/)?.[1] ?? ""
  }
  return text.slice(0, index).match(/([A-Za-z][A-Za-z0-9']*)\s*$/)?.[1] ?? ""
}

function isQuotedAt(text: string, span: TitleSpan): boolean {
  const before = text[span.start - 1] ?? ""
  const after = text[span.end] ?? ""
  return /['"“”‘’]/.test(before) && /['"“”‘’]/.test(after)
}

function hasYearParensAt(text: string, span: TitleSpan): boolean {
  if (/^\s*\(\d{4}\)/.test(text.slice(span.end))) return true
  return /\(\d{4}\)\s*$/.test(text.slice(Math.max(0, span.start - 8), span.start))
}

function isGenericCollocationAt(
  text: string,
  span: TitleSpan,
  nounTitle: boolean,
): boolean {
  const after = adjacentToken(text, span.end, "after")
  if (after && GENERIC_RIGHT_TOKEN.test(after)) return true
  if (nounTitle) {
    const before = adjacentToken(text, span.start, "before")
    if (before && GENERIC_LEFT_FOR_NOUN.test(before)) return true
  }
  return false
}

function hasWorkEvidenceAt(
  text: string,
  span: TitleSpan,
  nounTitle: boolean,
): boolean {
  if (isQuotedAt(text, span) || hasYearParensAt(text, span)) return true
  if (nounTitle) return false

  const left = text.slice(Math.max(0, span.start - 48), span.start)
  const right = text.slice(span.end, span.end + 48)
  if (FILM_NOUN_BEFORE_RE.test(left)) return true
  if (WORK_LEFT_RE.test(left)) return true
  if (WORK_RIGHT_RE.test(right)) return true
  return false
}

/**
 * True when `title` appears in `text` as a work, not as a generic English word.
 * No title blacklist — short/common titles require quotes, year, or cinematic framing.
 */
export function isAcceptableMovieTitleMention(text: string, title: string): boolean {
  const needle = title.trim()
  if (needle.length < 4) return false

  let occurrences = findWordOccurrences(text, needle)
  if (!occurrences.length && needle.length >= 6) {
    const idx = text.toLowerCase().indexOf(needle.toLowerCase())
    if (idx >= 0) occurrences = [{ start: idx, end: idx + needle.length }]
  }
  if (!occurrences.length) return false

  const nounTitle = isCinematicNounTitle(needle)
  const strong = needsStrongMovieTitleEvidence(needle)

  for (const occ of occurrences) {
    if (isGenericCollocationAt(text, occ, nounTitle)) continue
    if (strong) {
      if (hasWorkEvidenceAt(text, occ, nounTitle)) return true
      continue
    }
    return true
  }
  return false
}

/** Drop catalog movie hits the source does not actually mention as works. */
export function constrainEntitiesToSource(
  rawText: string,
  entities: ExtractedEntities,
): ExtractedEntities {
  const text = normalize(rawText)
  const movies = entities.movies.filter((m) => isAcceptableMovieTitleMention(text, m.title))
  const unresolved = [...entities.unresolved]
  if (
    entities.actors.length === 0 &&
    entities.directors.length === 0 &&
    movies.length === 0 &&
    !unresolved.some((u) => u.reason === "no_ar_entities")
  ) {
    unresolved.push({ mention: text.slice(0, 80), reason: "no_ar_entities" })
  }
  return { ...entities, movies, unresolved }
}

/**
 * Deterministic entity extraction against ActorRating DB.
 * The LLM does NOT choose what to fetch — this runs before Context Builder.
 */
export async function extractEntitiesFromText(
  prisma: PrismaClient,
  rawText: string,
): Promise<ExtractedEntities> {
  const text = normalize(rawText)
  const textLower = text.toLowerCase()
  const unresolved: ExtractedEntities["unresolved"] = []

  if (text.length < 3) {
    return { actors: [], movies: [], directors: [], unresolved: [{ mention: text, reason: "too_short" }] }
  }

  // Substring match against known actors (longest names first to prefer full matches).
  const actorHits = await prisma.$queryRaw<
    Array<{ id: string; name: string; slug: string | null }>
  >`
    SELECT a.id, a.name, a.slug
    FROM "Actor" a
    WHERE length(a.name) >= 5
      AND position(lower(a.name) in ${textLower}) > 0
    ORDER BY length(a.name) DESC
    LIMIT 25
  `

  const actors: ExtractedEntities["actors"] = []
  const coveredRanges: Array<[number, number]> = []
  for (const hit of actorHits) {
    const idx = textLower.indexOf(hit.name.toLowerCase())
    if (idx < 0) continue
    const end = idx + hit.name.length
    const overlaps = coveredRanges.some(([s, e]) => idx < e && end > s)
    if (overlaps) continue
    coveredRanges.push([idx, end])
    actors.push({
      id: hit.id,
      name: hit.name,
      slug: hit.slug,
      confidence: hit.name.split(/\s+/).length >= 2 ? 92 : 78,
    })
    if (actors.length >= 6) break
  }

  const directorHits = await prisma.$queryRaw<Array<{ director: string; filmCount: number }>>`
    SELECT m.director AS director, COUNT(*)::int AS "filmCount"
    FROM "Movie" m
    WHERE m.director IS NOT NULL
      AND length(m.director) >= 5
      AND position(lower(m.director) in ${textLower}) > 0
    GROUP BY m.director
    ORDER BY length(m.director) DESC, COUNT(*) DESC
    LIMIT 10
  `

  const directors: ExtractedEntities["directors"] = directorHits.map((d) => ({
    name: d.director,
    confidence: 88,
  }))

  const movieHits = await prisma.$queryRaw<
    Array<{
      id: string
      title: string
      year: number
      slug: string | null
      director: string | null
      genre: string | null
      indexingCohort: number
    }>
  >`
    SELECT m.id, m.title, m.year, m.slug, m.director, m.genre, m."indexingCohort" AS "indexingCohort"
    FROM "Movie" m
    WHERE NOT m."isFeaturette"
      AND length(m.title) >= 4
      AND position(lower(m.title) in ${textLower}) > 0
    ORDER BY length(m.title) DESC, m.year DESC
    LIMIT 15
  `

  const movies: ExtractedEntities["movies"] = []
  for (const m of movieHits) {
    if (!isAcceptableMovieTitleMention(text, m.title)) continue
    movies.push({ ...m, confidence: m.title.length >= 8 ? 90 : 75 })
    if (movies.length >= 5) break
  }

  // Casting-news heuristics: "joins X's next film" often has no movie title yet.
  if (actors.length === 0 && directors.length === 0 && movies.length === 0) {
    unresolved.push({ mention: text.slice(0, 80), reason: "no_ar_entities" })
  }

  return { actors, movies, directors, unresolved }
}
