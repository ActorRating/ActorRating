import { createHash } from "crypto"
import type { PrismaClient } from "@prisma/client"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import { isRatePageIndexable } from "@/lib/rate-page-seo"
import { TEMPLATE_VERSION } from "@/lib/editorial/editorial-version"

const DIM_KEYS = [
  "emotionalRangeDepth",
  "characterBelievability",
  "technicalSkill",
  "screenPresence",
  "chemistryInteraction",
] as const

const DIM_LABELS: Record<(typeof DIM_KEYS)[number], string> = {
  emotionalRangeDepth: "Emotional Range & Depth",
  characterBelievability: "Character Believability",
  technicalSkill: "Technical Skill",
  screenPresence: "Screen Presence",
  chemistryInteraction: "Chemistry & Interaction",
}

export type PerformanceFactsPack = {
  actorName: string
  actorSlug: string | null
  movieTitle: string
  movieYear: number
  movieSlug: string | null
  director: string | null
  genres: string[]
  character: string | null
  tier: string | null
  ratingCount: number
  avg10: number | null
  dimensions: Record<string, number | null>
  strongestDimensions: string[]
  weakestDimensions: string[]
  relatedPerformanceLabels: string[]
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`
}

export function hashPerformanceFacts(
  facts: PerformanceFactsPack,
  promptVersion = TEMPLATE_VERSION,
): string {
  return createHash("sha256").update(`${stableStringify(facts)}|${promptVersion}`).digest("hex")
}

function parseGenres(genre: string | null | undefined): string[] {
  if (!genre?.trim()) return []
  return genre
    .split(/[,|/]/)
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 6)
}

/**
 * Build a deterministic facts pack for editorial generation/grounding.
 * Intentionally avoids heavy similar-performance queries so admin/cron batches stay fast.
 */
export async function buildPerformanceFactsPack(
  prisma: PrismaClient,
  actorId: string,
  movieId: string,
): Promise<PerformanceFactsPack | null> {
  const perf = await prisma.performance.findFirst({
    where: { actorId, movieId, userId: SYSTEM_USER_ID },
    select: {
      character: true,
      tier: true,
      seededAggregateScore: true,
      actor: { select: { id: true, name: true, slug: true } },
      movie: {
        select: {
          id: true,
          title: true,
          year: true,
          slug: true,
          director: true,
          genre: true,
          indexingCohort: true,
          isFeaturette: true,
        },
      },
    },
  })

  if (!perf || perf.movie.isFeaturette) return null

  const ratings = await prisma.rating.findMany({
    where: { actorId, movieId, userId: { not: null } },
    select: {
      emotionalRangeDepth: true,
      characterBelievability: true,
      technicalSkill: true,
      screenPresence: true,
      chemistryInteraction: true,
    },
  })

  const ratingCount = ratings.length
  if (
    !isRatePageIndexable({
      movieSlug: perf.movie.slug,
      movieTitle: perf.movie.title,
      indexingCohort: perf.movie.indexingCohort,
      seededAggregateScore: perf.seededAggregateScore,
      communityRatingCount: ratingCount,
      tier: perf.tier,
    })
  ) {
    return null
  }

  const dimensions: Record<string, number | null> = {}
  const scored: Array<{ key: (typeof DIM_KEYS)[number]; score: number }> = []

  for (const field of DIM_KEYS) {
    const vals = ratings.map((r) => r[field]).filter((v): v is number => typeof v === "number")
    if (vals.length === 0) {
      dimensions[field] = null
    } else {
      const dimAvg100 = vals.reduce((s, v) => s + v, 0) / vals.length
      const score = dimAvg100 > 0 ? Number((dimAvg100 / 10).toFixed(1)) : null
      dimensions[field] = score
      if (score != null) scored.push({ key: field, score })
    }
  }

  let avg10: number | null = null
  if (ratings.length > 0) {
    const perRating = ratings.map((r) => {
      const vals = DIM_KEYS.map((f) => r[f]).filter((v): v is number => typeof v === "number")
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    })
    const avg100 = perRating.reduce((s, v) => s + v, 0) / perRating.length
    avg10 = avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null
  }

  scored.sort((a, b) => b.score - a.score)
  const strongestDimensions = scored.slice(0, 2).map((s) => DIM_LABELS[s.key])
  const weakestDimensions = [...scored]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((s) => DIM_LABELS[s.key])

  return {
    actorName: perf.actor.name,
    actorSlug: perf.actor.slug,
    movieTitle: perf.movie.title,
    movieYear: perf.movie.year,
    movieSlug: perf.movie.slug,
    director: perf.movie.director,
    genres: parseGenres(perf.movie.genre),
    character: perf.character,
    tier: perf.tier,
    ratingCount,
    avg10,
    dimensions,
    strongestDimensions,
    weakestDimensions,
    // Links live in RatePageInternalLinksSection — keep generation cheap.
    relatedPerformanceLabels: [],
  }
}
