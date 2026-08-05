import type { PrismaClient } from "@prisma/client"
import {
  getPersonMovieCredits,
  buildPosterUrl,
  rateLimitTmdb,
} from "@/lib/tmdb"
import { isJokePerformance } from "@/lib/joke-performance-filter"
import { matchesFeaturetteTitle } from "@/lib/non-rateable"
import { parseTmdbReleaseDate } from "@/lib/movie-release"
import { createMovieSlug } from "@/lib/createSlug"
import {
  SYSTEM_USER_ID,
  upsertPerformanceForMovie,
  computeTierSimple,
} from "@/lib/movie-ingestion"

export type ExpandFilmographyResult = {
  actorsExpanded: number
  performancesAdded: number
  movieShellsCreated: number
}

/**
 * Expand one actor's TMDB filmography: create movie shells + that actor's performances.
 * Full cast/poster for shells can be filled later via incomplete-movie backfill / ingest:all-cast.
 */
export async function expandActorFilmography(
  prisma: PrismaClient,
  actor: { id: string; tmdbId: number | null; name: string },
): Promise<{ performancesAdded: number; movieShellsCreated: number }> {
  if (actor.tmdbId == null) {
    return { performancesAdded: 0, movieShellsCreated: 0 }
  }

  const credits = await getPersonMovieCredits(actor.tmdbId)
  let performancesAdded = 0
  let movieShellsCreated = 0
  const currentYear = new Date().getFullYear()

  for (const credit of credits) {
    if (!credit.releaseDate) continue

    const year = new Date(credit.releaseDate).getFullYear()
    if (!Number.isFinite(year) || year < 1900 || year > currentYear) continue
    if (matchesFeaturetteTitle(credit.title)) continue
    if (isJokePerformance(credit.title, credit.overview, year, null)) continue

    let movie = await prisma.movie.findUnique({
      where: { tmdbId: credit.tmdbId },
      select: { id: true },
    })

    if (!movie) {
      const byTitle = await prisma.movie.findFirst({
        where: { title: credit.title, year },
        select: { id: true, tmdbId: true },
      })
      if (byTitle) {
        if (byTitle.tmdbId == null) {
          movie = await prisma.movie.update({
            where: { id: byTitle.id },
            data: { tmdbId: credit.tmdbId },
            select: { id: true },
          })
        } else {
          movie = { id: byTitle.id }
        }
      }
    }

    if (!movie) {
      const releaseDate = parseTmdbReleaseDate(credit.releaseDate)
      const posterUrl = buildPosterUrl(credit.posterPath)
      const slugBase = createMovieSlug(credit.title, year)
      const slugTaken = await prisma.movie.findUnique({
        where: { slug: slugBase },
        select: { id: true },
      })
      try {
        movie = await prisma.movie.create({
          data: {
            tmdbId: credit.tmdbId,
            title: credit.title,
            year,
            overview: credit.overview,
            slug: slugTaken ? undefined : slugBase,
            ...(releaseDate && { releaseDate }),
            ...(posterUrl && { posterUrl }),
          },
          select: { id: true },
        })
        movieShellsCreated += 1
      } catch {
        movie = await prisma.movie.findUnique({
          where: { tmdbId: credit.tmdbId },
          select: { id: true },
        })
        if (!movie) continue
      }
    }

    const existing = await prisma.performance.findFirst({
      where: {
        actorId: actor.id,
        movieId: movie.id,
        userId: SYSTEM_USER_ID,
      },
      select: { id: true },
    })
    if (existing) continue

    const order = credit.order ?? 99
    const tier = computeTierSimple(order)
    await upsertPerformanceForMovie(
      prisma,
      SYSTEM_USER_ID,
      movie.id,
      actor.id,
      order,
      tier,
      { character: credit.character },
    )
    performancesAdded += 1
  }

  // Tiny pause so a long filmography doesn't stampede TMDB when we fan out actors
  await rateLimitTmdb()
  return { performancesAdded, movieShellsCreated }
}

/**
 * Expand filmography for every newly created cast member (no cap).
 * Serialized + rate-limited — can take a while for large new casts.
 */
export async function expandFilmographiesForNewActors(
  prisma: PrismaClient,
  createdActors: Array<{ id: string; tmdbId: number | null; order: number; name: string }>,
): Promise<ExpandFilmographyResult> {
  const eligible = createdActors
    .filter((a) => a.tmdbId != null)
    .sort((a, b) => a.order - b.order)

  let actorsExpanded = 0
  let performancesAdded = 0
  let movieShellsCreated = 0

  for (const actor of eligible) {
    try {
      const result = await expandActorFilmography(prisma, actor)
      actorsExpanded += 1
      performancesAdded += result.performancesAdded
      movieShellsCreated += result.movieShellsCreated
    } catch (error) {
      console.error(
        `Filmography expand failed for ${actor.name} (tmdb=${actor.tmdbId}):`,
        error,
      )
    }
  }

  return { actorsExpanded, performancesAdded, movieShellsCreated }
}
