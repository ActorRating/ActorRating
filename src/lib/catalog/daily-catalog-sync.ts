import type { PrismaClient } from "@prisma/client"
import {
  addMovieFromTmdbId,
  completeIncompleteMovies,
} from "@/lib/admin/addMovieFromTitle"
import { isAdultContentMovie } from "@/lib/adult-content-filter"
import { matchesFeaturetteTitle } from "@/lib/non-rateable"
import { isJokePerformance } from "@/lib/joke-performance-filter"
import {
  fetchTmdbNowPlaying,
  fetchTmdbUpcoming,
  fetchTmdbRecentReleases,
  type TmdbDiscoverMovie,
} from "@/lib/tmdb"

export type CatalogSyncMovieResult = {
  tmdbId: number
  title: string
  status: "added" | "synced" | "skipped" | "failed"
  reason?: string
  actorsCreated?: number
  performancesUpserted?: number
  filmographyActorsExpanded?: number
}

export type DailyCatalogSyncResult = {
  discovered: number
  candidates: number
  processed: number
  added: number
  synced: number
  skipped: number
  failed: number
  filmographyActorsExpanded: number
  filmographyMovieShellsCreated: number
  incompleteBackfill: Awaited<ReturnType<typeof completeIncompleteMovies>> | null
  movies: CatalogSyncMovieResult[]
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]
  if (raw == null || raw.trim() === "") return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function shouldSkipDiscoverHit(hit: TmdbDiscoverMovie): string | null {
  if (hit.adult) return "adult"
  if (hit.video) return "video"
  if (!hit.releaseDate) return "no_release_date"
  if (matchesFeaturetteTitle(hit.title)) return "featurette"
  if (isAdultContentMovie({ title: hit.title, overview: hit.overview })) {
    return "adult_title"
  }
  const year = new Date(hit.releaseDate).getFullYear()
  if (isJokePerformance(hit.title, hit.overview, year, null)) return "joke"
  return null
}

/**
 * Daily Coolify catalog sync:
 * 1) Discover now-playing + upcoming + recent theatrical releases
 * 2) Ingest missing / incomplete movies with full cast
 * 3) Expand filmography for newly created top-billed actors
 * 4) Light backfill of incomplete movie shells
 */
export async function runDailyCatalogSync(
  prisma: PrismaClient,
): Promise<DailyCatalogSyncResult> {
  const region = (process.env.CATALOG_SYNC_REGION || "US").trim() || "US"
  const maxMovies = envInt("CATALOG_SYNC_MAX_MOVIES", 12, 1, 40)
  const maxFilmographyActors = envInt("CATALOG_SYNC_MAX_FILMOGRAPHY_ACTORS", 8, 0, 40)
  const maxBillingOrder = envInt("CATALOG_SYNC_MAX_BILLING_ORDER", 12, 0, 50)
  const incompleteTake = envInt("CATALOG_SYNC_INCOMPLETE_TAKE", 8, 0, 40)
  const recentDays = envInt("CATALOG_SYNC_RECENT_DAYS", 14, 1, 60)
  const minPopularity = envInt("CATALOG_SYNC_MIN_POPULARITY", 3, 0, 100)

  const [nowPlaying, upcoming, recent] = await Promise.all([
    fetchTmdbNowPlaying({ region, page: 1 }),
    fetchTmdbUpcoming({ region, page: 1 }),
    fetchTmdbRecentReleases({ region, daysBack: recentDays, page: 1 }),
  ])

  const byId = new Map<number, TmdbDiscoverMovie>()
  for (const hit of [...nowPlaying, ...upcoming, ...recent]) {
    const existing = byId.get(hit.tmdbId)
    if (!existing || hit.popularity > existing.popularity) {
      byId.set(hit.tmdbId, hit)
    }
  }

  const discovered = byId.size
  const ranked = [...byId.values()]
    .filter((hit) => hit.popularity >= minPopularity)
    .filter((hit) => shouldSkipDiscoverHit(hit) == null)
    .sort((a, b) => b.popularity - a.popularity)

  const candidates = ranked.length
  const movies: CatalogSyncMovieResult[] = []
  let added = 0
  let synced = 0
  let skipped = 0
  let failed = 0
  let filmographyActorsExpanded = 0
  let filmographyMovieShellsCreated = 0
  let processed = 0

  for (const hit of ranked) {
    if (processed >= maxMovies) break

    const existing = await prisma.movie.findUnique({
      where: { tmdbId: hit.tmdbId },
      select: { id: true, castIngestedAt: true, title: true },
    })

    // Already fully ingested — do not re-expand filmography every day.
    if (existing?.castIngestedAt) {
      skipped += 1
      movies.push({
        tmdbId: hit.tmdbId,
        title: hit.title,
        status: "skipped",
        reason: "already_ingested",
      })
      continue
    }

    processed += 1
    try {
      const result = await addMovieFromTmdbId(prisma, hit.tmdbId, {
        allowUpcomingYear: true,
        maxFilmographyActors,
        maxBillingOrderForFilmography: maxBillingOrder,
      })

      if (!result.ok) {
        failed += 1
        movies.push({
          tmdbId: hit.tmdbId,
          title: hit.title,
          status: "failed",
          reason: result.error,
        })
        continue
      }

      filmographyActorsExpanded += result.filmographyActorsExpanded
      filmographyMovieShellsCreated += result.filmographyMovieShellsCreated

      if (result.exists) {
        synced += 1
        movies.push({
          tmdbId: hit.tmdbId,
          title: result.movie.title,
          status: "synced",
          actorsCreated: result.actorsCreated,
          performancesUpserted: result.performancesUpserted,
          filmographyActorsExpanded: result.filmographyActorsExpanded,
        })
      } else {
        added += 1
        movies.push({
          tmdbId: hit.tmdbId,
          title: result.movie.title,
          status: "added",
          actorsCreated: result.actorsCreated,
          performancesUpserted: result.performancesUpserted,
          filmographyActorsExpanded: result.filmographyActorsExpanded,
        })
      }
    } catch (error) {
      failed += 1
      movies.push({
        tmdbId: hit.tmdbId,
        title: hit.title,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  let incompleteBackfill: Awaited<ReturnType<typeof completeIncompleteMovies>> | null =
    null
  if (incompleteTake > 0) {
    incompleteBackfill = await completeIncompleteMovies(prisma, {
      take: incompleteTake,
    })
    filmographyActorsExpanded += incompleteBackfill.filmographyActorsExpanded
    filmographyMovieShellsCreated += incompleteBackfill.filmographyMovieShellsCreated
  }

  return {
    discovered,
    candidates,
    processed,
    added,
    synced,
    skipped,
    failed,
    filmographyActorsExpanded,
    filmographyMovieShellsCreated,
    incompleteBackfill,
    movies,
  }
}
