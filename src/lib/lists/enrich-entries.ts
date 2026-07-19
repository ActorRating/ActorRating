/**
 * Resolve list entries against DB: names, community avg, indexability warnings.
 */
import "server-only"
import { prisma } from "@/lib/prisma"
import { isRatePageIndexable } from "@/lib/rate-page-seo"
import type { ListEntryFrontmatter } from "./load-lists"

const SYSTEM_USER_ID = "uuid-from-auth-users"

export type EnrichedListEntry = {
  actorSlug: string
  movieSlug: string
  actorName: string
  movieTitle: string
  movieYear: number | null
  actorImageUrl: string | null
  moviePosterUrl: string | null
  /** Film-level Critic Aggregate (TMDB), when present */
  movieCriticAggregate: number | null
  ratePath: string
  communityAvg10: number | null
  communityRatingCount: number
  tier: string | null
  indexable: boolean
  exists: boolean
  warning: string | null
}

function computeAvg10(ratings: Array<{
  emotionalRangeDepth: number | null
  characterBelievability: number | null
  technicalSkill: number | null
  screenPresence: number | null
  chemistryInteraction: number | null
}>): number | null {
  if (ratings.length === 0) return null
  const totals = ratings.map((r) => {
    const parts = [
      r.emotionalRangeDepth,
      r.characterBelievability,
      r.technicalSkill,
      r.screenPresence,
      r.chemistryInteraction,
    ].filter((v): v is number => typeof v === "number")
    if (parts.length === 0) return null
    return parts.reduce((s, v) => s + v, 0) / parts.length
  }).filter((v): v is number => v != null)
  if (totals.length === 0) return null
  const avg100 = totals.reduce((s, v) => s + v, 0) / totals.length
  return Number((avg100 / 10).toFixed(1))
}

export async function enrichListEntries(
  entries: ListEntryFrontmatter[],
  listSlug: string,
): Promise<EnrichedListEntry[]> {
  const out: EnrichedListEntry[] = []

  for (const entry of entries) {
    const [actor, movie] = await Promise.all([
      prisma.actor.findFirst({
        where: { slug: entry.actorSlug },
        select: { id: true, name: true, slug: true, imageUrl: true },
      }),
      prisma.movie.findFirst({
        where: { slug: entry.movieSlug },
        select: {
          id: true,
          title: true,
          year: true,
          slug: true,
          indexingCohort: true,
          isFeaturette: true,
          posterUrl: true,
          tmdbRating: true,
        },
      }),
    ])

    if (!actor || !movie || movie.isFeaturette) {
      const warning = `[lists:${listSlug}] Missing actor/movie for ${entry.movieSlug}/${entry.actorSlug}`
      console.warn(warning)
      out.push({
        actorSlug: entry.actorSlug,
        movieSlug: entry.movieSlug,
        actorName: entry.actorSlug,
        movieTitle: entry.movieSlug,
        movieYear: null,
        actorImageUrl: null,
        moviePosterUrl: null,
        movieCriticAggregate: null,
        ratePath: `/rate/${entry.movieSlug}/${entry.actorSlug}`,
        communityAvg10: null,
        communityRatingCount: 0,
        tier: null,
        indexable: false,
        exists: false,
        warning,
      })
      continue
    }

    const [systemPerf, anyPerf, ratings] = await Promise.all([
      prisma.performance.findFirst({
        where: { actorId: actor.id, movieId: movie.id, userId: SYSTEM_USER_ID },
        select: { seededAggregateScore: true, tier: true },
      }),
      prisma.performance.findFirst({
        where: { actorId: actor.id, movieId: movie.id },
        select: { seededAggregateScore: true, tier: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
      prisma.rating.findMany({
        where: { actorId: actor.id, movieId: movie.id },
        select: {
          emotionalRangeDepth: true,
          characterBelievability: true,
          technicalSkill: true,
          screenPresence: true,
          chemistryInteraction: true,
        },
      }),
    ])

    const perf = systemPerf ?? anyPerf
    const communityRatingCount = ratings.length
    const communityAvg10 = computeAvg10(ratings)
    const seededAggregateScore =
      typeof perf?.seededAggregateScore === "number" ? perf.seededAggregateScore : null
    const tier = perf?.tier ?? null

    const indexable = isRatePageIndexable({
      movieSlug: movie.slug ?? movie.id,
      movieTitle: movie.title,
      indexingCohort: movie.indexingCohort,
      seededAggregateScore,
      communityRatingCount,
      tier,
    })

    let warning: string | null = null
    if (!perf) {
      warning = `[lists:${listSlug}] No Performance row for ${movie.slug}/${actor.slug}`
    } else if (tier === "MINOR") {
      warning = `[lists:${listSlug}] Entry is tier=MINOR (noindex): ${movie.slug}/${actor.slug}`
    } else if (!indexable) {
      warning = `[lists:${listSlug}] Entry is not indexable: ${movie.slug}/${actor.slug} (tier=${tier}, community=${communityRatingCount}, seeded=${seededAggregateScore ?? "null"}, cohort=${movie.indexingCohort})`
    }
    if (warning) console.warn(warning)

    out.push({
      actorSlug: actor.slug ?? entry.actorSlug,
      movieSlug: movie.slug ?? entry.movieSlug,
      actorName: actor.name,
      movieTitle: movie.title,
      movieYear: movie.year,
      actorImageUrl: actor.imageUrl ?? null,
      moviePosterUrl: movie.posterUrl ?? null,
      movieCriticAggregate:
        typeof movie.tmdbRating === "number" ? movie.tmdbRating : null,
      ratePath: `/rate/${movie.slug ?? movie.id}/${actor.slug ?? actor.id}`,
      communityAvg10,
      communityRatingCount,
      tier,
      indexable,
      exists: true,
      warning,
    })
  }

  return out
}
