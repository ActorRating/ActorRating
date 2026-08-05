import type { PrismaClient } from "@prisma/client"
import {
  searchMovie,
  getMovieCreditsForIngestion,
  getMovieDetails,
  buildPosterUrl,
} from "@/lib/tmdb"
import { isJokePerformance } from "@/lib/joke-performance-filter"
import { validateContent } from "@/lib/content-validator"
import { SYSTEM_USER_ID, syncMovieCast } from "@/lib/movie-ingestion"
import { parseTmdbReleaseDate } from "@/lib/movie-release"
import { createMovieSlug } from "@/lib/createSlug"
import { expandFilmographiesForNewActors } from "@/lib/actorFilmography"

export type AddMovieFromTitleResult =
  | {
      ok: true
      movie: {
        id: string
        title: string
        year: number
        slug: string | null
        posterUrl: string | null
        castIngestedAt: Date | null
      }
      actorsCreated: number
      performancesUpserted: number
      filmographyActorsExpanded: number
      filmographyPerformancesAdded: number
      filmographyMovieShellsCreated: number
      exists: boolean
      warnings?: string[]
      message: string
    }
  | { ok: false; status: number; error: string; title?: string; year?: number }

async function ensureUniqueMovieSlug(
  prisma: PrismaClient,
  title: string,
  year: number,
  movieId: string,
): Promise<string> {
  const base = createMovieSlug(title, year)
  const clash = await prisma.movie.findFirst({
    where: { slug: base, NOT: { id: movieId } },
    select: { id: true },
  })
  if (!clash) return base
  return `${base}-${movieId.slice(-6).toLowerCase()}`
}

/**
 * Apply poster, slug, TMDB scores, castIngestedAt — same completeness as bulk ingest.
 */
export async function enrichMovieMetadataFromTmdb(
  prisma: PrismaClient,
  movie: {
    id: string
    title: string
    year: number
    tmdbId: number | null
    slug: string | null
    posterUrl: string | null
    releaseDate: Date | null
  },
) {
  if (movie.tmdbId == null) {
    throw new Error(`Movie "${movie.title}" has no tmdbId`)
  }

  const details = await getMovieDetails(movie.tmdbId)
  const posterUrl = buildPosterUrl(details?.posterPath ?? null)
  const releaseDate = parseTmdbReleaseDate(details?.releaseDate ?? null)
  const slug =
    movie.slug ||
    (await ensureUniqueMovieSlug(prisma, movie.title, movie.year, movie.id))

  return prisma.movie.update({
    where: { id: movie.id },
    data: {
      castIngestedAt: new Date(),
      slug,
      ...(posterUrl && { posterUrl }),
      ...(releaseDate && !movie.releaseDate ? { releaseDate } : {}),
      ...(typeof details?.voteAverage === "number"
        ? {
            tmdbRating: details.voteAverage,
            tmdbVoteCount: details.voteCount ?? undefined,
            tmdbDataFetchedAt: new Date(),
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      year: true,
      slug: true,
      posterUrl: true,
      castIngestedAt: true,
    },
  })
}

/**
 * Admin / seed path: search TMDB by title → movie + full cast/performances + poster/slug.
 * Idempotent: existing movies resync cast and refresh metadata.
 */
export async function addMovieFromTitle(
  prisma: PrismaClient,
  titleRaw: string,
): Promise<AddMovieFromTitleResult> {
  const title = titleRaw.trim()
  if (!title) {
    return { ok: false, status: 400, error: "Title is required" }
  }

  const movieData = await searchMovie(title)
  if (!movieData) {
    return { ok: false, status: 404, error: `Movie not found: ${title}` }
  }

  const credits = await getMovieCreditsForIngestion(movieData.id)
  if (credits.cast.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "TMDB returned no credited cast for this movie; skipping ingestion.",
      title: movieData.title,
    }
  }

  const year = new Date(movieData.release_date).getFullYear()
  const releaseDate = parseTmdbReleaseDate(movieData.release_date)
  const currentYear = new Date().getFullYear()
  if (isNaN(year) || year < 1900 || year > currentYear) {
    return {
      ok: false,
      status: 400,
      error: `Invalid movie year: ${year}. Movies must have a valid release year between 1900 and ${currentYear}.`,
      title: movieData.title,
      year,
    }
  }

  if (isJokePerformance(movieData.title, movieData.overview, year, credits.director)) {
    return {
      ok: false,
      status: 400,
      error:
        "This appears to be a joke performance (TikTok, YouTube skit, meme, etc.) and will not be added. Only legitimate acting credits are accepted.",
      title: movieData.title,
    }
  }

  const contentWarnings = validateContent(movieData.title, movieData.overview)

  let movie = await prisma.movie.findFirst({
    where: { title: movieData.title, year },
  })
  const movieExisted = !!movie

  if (!movie) {
    const slug = createMovieSlug(movieData.title, year)
    const slugTaken = await prisma.movie.findUnique({
      where: { slug },
      select: { id: true },
    })
    movie = await prisma.movie.create({
      data: {
        title: movieData.title,
        year,
        director: credits.director,
        tmdbId: movieData.id,
        overview: movieData.overview,
        slug: slugTaken ? undefined : slug,
        ...(releaseDate && { releaseDate }),
      },
    })
  } else {
    movie = await prisma.movie.update({
      where: { id: movie.id },
      data: {
        ...(movie.tmdbId === null ? { tmdbId: movieData.id } : {}),
        director: credits.director,
        ...(releaseDate && !movie.releaseDate ? { releaseDate } : {}),
      },
    })
  }

  const { actorsCreated, performancesUpserted, createdActors } = await syncMovieCast(
    prisma,
    movie.id,
    SYSTEM_USER_ID,
    credits,
    { director: credits.director },
  )

  const enriched = await enrichMovieMetadataFromTmdb(prisma, {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    tmdbId: movie.tmdbId,
    slug: movie.slug,
    posterUrl: movie.posterUrl,
    releaseDate: movie.releaseDate,
  })

  // Expand filmography for newly created top-billed actors (movie shells + their credits).
  const filmography = await expandFilmographiesForNewActors(prisma, createdActors)

  return {
    ok: true,
    movie: enriched,
    actorsCreated,
    performancesUpserted,
    filmographyActorsExpanded: filmography.actorsExpanded,
    filmographyPerformancesAdded: filmography.performancesAdded,
    filmographyMovieShellsCreated: filmography.movieShellsCreated,
    exists: movieExisted,
    warnings: contentWarnings.length > 0 ? contentWarnings.map((w) => w.message) : undefined,
    message: movieExisted
      ? `Movie fully synced: ${enriched.title} (${enriched.year}) — ${performancesUpserted} performances` +
        (filmography.actorsExpanded
          ? `, expanded ${filmography.actorsExpanded} new actor filmographies`
          : "")
      : `Successfully added movie: ${enriched.title} (${enriched.year}) — ${performancesUpserted} performances` +
        (filmography.actorsExpanded
          ? `, expanded ${filmography.actorsExpanded} new actor filmographies (+${filmography.movieShellsCreated} movie shells)`
          : ""),
  }
}

/**
 * Backfill movies that were added incompletely (missing poster, slug, or castIngestedAt).
 * Also expands TMDB filmography for cast members who look unexpanded (few system performances).
 */
export async function completeIncompleteMovies(
  prisma: PrismaClient,
  options?: { take?: number },
): Promise<{
  scanned: number
  completed: number
  filmographyActorsExpanded: number
  filmographyPerformancesAdded: number
  filmographyMovieShellsCreated: number
  failed: Array<{ id: string; title: string; error: string }>
}> {
  const take = Math.min(Math.max(options?.take ?? 40, 1), 100)
  const incomplete = await prisma.movie.findMany({
    where: {
      tmdbId: { not: null },
      isFeaturette: false,
      OR: [{ castIngestedAt: null }, { posterUrl: null }, { slug: null }],
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      slug: true,
      posterUrl: true,
      releaseDate: true,
      director: true,
    },
  })

  let completed = 0
  let filmographyActorsExpanded = 0
  let filmographyPerformancesAdded = 0
  let filmographyMovieShellsCreated = 0
  const failed: Array<{ id: string; title: string; error: string }> = []
  /** Avoid re-expanding the same actor twice in one backfill run. */
  const expandedActorIds = new Set<string>()

  for (const movie of incomplete) {
    try {
      const perfCount = await prisma.performance.count({
        where: { movieId: movie.id, userId: SYSTEM_USER_ID },
      })

      if (perfCount === 0 && movie.tmdbId != null) {
        const credits = await getMovieCreditsForIngestion(movie.tmdbId)
        if (credits.cast.length > 0) {
          await syncMovieCast(prisma, movie.id, SYSTEM_USER_ID, credits, {
            director: credits.director ?? movie.director ?? undefined,
          })
        }
      }

      await enrichMovieMetadataFromTmdb(prisma, movie)

      const castOnMovie = await prisma.performance.findMany({
        where: { movieId: movie.id, userId: SYSTEM_USER_ID },
        orderBy: { order: "asc" },
        select: {
          order: true,
          actor: { select: { id: true, tmdbId: true, name: true } },
        },
      })

      const actorsToExpand: Array<{
        id: string
        tmdbId: number | null
        order: number
        name: string
      }> = []

      for (const row of castOnMovie) {
        if (expandedActorIds.has(row.actor.id)) continue
        if (row.actor.tmdbId == null) continue

        // Heuristic: filmography not expanded yet (only a few system credits).
        const actorPerfCount = await prisma.performance.count({
          where: { actorId: row.actor.id, userId: SYSTEM_USER_ID },
        })
        if (actorPerfCount > 5) continue

        actorsToExpand.push({
          id: row.actor.id,
          tmdbId: row.actor.tmdbId,
          order: row.order ?? 99,
          name: row.actor.name,
        })
      }

      if (actorsToExpand.length > 0) {
        const filmography = await expandFilmographiesForNewActors(
          prisma,
          actorsToExpand,
        )
        filmographyActorsExpanded += filmography.actorsExpanded
        filmographyPerformancesAdded += filmography.performancesAdded
        filmographyMovieShellsCreated += filmography.movieShellsCreated
        for (const a of actorsToExpand) expandedActorIds.add(a.id)
      }

      completed += 1
    } catch (error) {
      failed.push({
        id: movie.id,
        title: movie.title,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return {
    scanned: incomplete.length,
    completed,
    filmographyActorsExpanded,
    filmographyPerformancesAdded,
    filmographyMovieShellsCreated,
    failed,
  }
}
