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
    // Avoid matching tiny generic titles unless exact-ish word boundary
    if (m.title.length < 6 && !new RegExp(`\\b${escapeRegExp(m.title)}\\b`, "i").test(text)) {
      continue
    }
    movies.push({ ...m, confidence: m.title.length >= 8 ? 90 : 75 })
    if (movies.length >= 5) break
  }

  // Casting-news heuristics: "joins X's next film" often has no movie title yet.
  if (actors.length === 0 && directors.length === 0 && movies.length === 0) {
    unresolved.push({ mention: text.slice(0, 80), reason: "no_ar_entities" })
  }

  return { actors, movies, directors, unresolved }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
