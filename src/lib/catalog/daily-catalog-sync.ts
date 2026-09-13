import type { PrismaClient } from "@prisma/client"
import {
  addMovieFromTmdbId,
  completeIncompleteMovies,
  CATALOG_BLOCKED_GENRE_IDS,
} from "@/lib/admin/addMovieFromTitle"
import { isAdultContentMovie } from "@/lib/adult-content-filter"
import { matchesFeaturetteTitle } from "@/lib/non-rateable"
import { isJokePerformance } from "@/lib/joke-performance-filter"
import {
  fetchTmdbNowPlaying,
  fetchTmdbUpcoming,
  fetchTmdbRecentReleases,
  fetchTmdbFutureReleases,
  type TmdbDiscoverMovie,
} from "@/lib/tmdb"

export type CatalogSyncMovieResult = {
  tmdbId: number
  title: string
  status: "added" | "synced" | "skipped" | "failed"
  reason?: string
  track?: "theatrical" | "upcoming"
  actorsCreated?: number
  performancesUpserted?: number
  filmographyActorsExpanded?: number
}

export type DailyCatalogSyncResult = {
  discovered: number
  candidates: number
  upcomingCandidates: number
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

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function blockedGenreReason(genreIds: number[]): string | null {
  for (const id of genreIds) {
    if (!CATALOG_BLOCKED_GENRE_IDS.has(id)) continue
    if (id === 16) return "animation"
    if (id === 10751) return "family"
    if (id === 10770) return "tv_movie"
  }
  return null
}

function shouldSkipDiscoverHit(
  hit: TmdbDiscoverMovie,
  opts: { minPopularity: number; minVoteCount: number; requireFuture?: boolean },
): string | null {
  if (hit.adult) return "adult"
  if (hit.video) return "video"
  if (!hit.releaseDate) return "no_release_date"
  if (matchesFeaturetteTitle(hit.title)) return "featurette"
  if (isAdultContentMovie({ title: hit.title, overview: hit.overview })) {
    return "adult_title"
  }
  const year = new Date(hit.releaseDate).getFullYear()
  if (isJokePerformance(hit.title, hit.overview, year, null)) return "joke"

  const genreBlock = blockedGenreReason(hit.genreIds)
  if (genreBlock) return genreBlock

  const today = todayUtc()
  if (opts.requireFuture && hit.releaseDate <= today) return "not_upcoming"
  if (hit.popularity < opts.minPopularity) return "low_popularity"

  // Upcoming titles often have 0 votes — only enforce vote floor once released.
  const released = hit.releaseDate <= today
  if (released && hit.voteCount < opts.minVoteCount) return "low_vote_count"

  return null
}

function mergeHits(
  into: Map<number, TmdbDiscoverMovie>,
  hits: TmdbDiscoverMovie[],
) {
  for (const hit of hits) {
    const existing = into.get(hit.tmdbId)
    if (!existing || hit.popularity > existing.popularity) {
      into.set(hit.tmdbId, hit)
    }
  }
}

async function ingestHit(
  prisma: PrismaClient,
  hit: TmdbDiscoverMovie,
  opts: {
    track: "theatrical" | "upcoming"
    maxFilmographyActors: number
    maxBillingOrder: number
    minVoteCount: number
    minCastSize: number
  },
): Promise<{
  result: CatalogSyncMovieResult
  filmographyActorsExpanded: number
  filmographyMovieShellsCreated: number
  added: number
  synced: number
  skipped: number
  failed: number
}> {
  const existing = await prisma.movie.findUnique({
    where: { tmdbId: hit.tmdbId },
    select: { id: true, castIngestedAt: true, title: true },
  })

  if (existing?.castIngestedAt) {
    return {
      result: {
        tmdbId: hit.tmdbId,
        title: hit.title,
        status: "skipped",
        reason: "already_ingested",
        track: opts.track,
      },
      filmographyActorsExpanded: 0,
      filmographyMovieShellsCreated: 0,
      added: 0,
      synced: 0,
      skipped: 1,
      failed: 0,
    }
  }

  try {
    const result = await addMovieFromTmdbId(prisma, hit.tmdbId, {
      allowUpcomingYear: true,
      maxFilmographyActors: opts.maxFilmographyActors,
      maxBillingOrderForFilmography: opts.maxBillingOrder,
      catalogQuality: true,
      // Upcoming track: don't require votes (often 0 pre-release).
      minVoteCount: opts.track === "upcoming" ? 0 : opts.minVoteCount,
      minCastSize: opts.minCastSize,
    })

    if (!result.ok) {
      return {
        result: {
          tmdbId: hit.tmdbId,
          title: hit.title,
          status: "failed",
          reason: result.error,
          track: opts.track,
        },
        filmographyActorsExpanded: 0,
        filmographyMovieShellsCreated: 0,
        added: 0,
        synced: 0,
        skipped: 0,
        failed: 1,
      }
    }

    const base = {
      tmdbId: hit.tmdbId,
      title: result.movie.title,
      track: opts.track,
      actorsCreated: result.actorsCreated,
      performancesUpserted: result.performancesUpserted,
      filmographyActorsExpanded: result.filmographyActorsExpanded,
    } as const

    return {
      result: {
        ...base,
        status: result.exists ? "synced" : "added",
      },
      filmographyActorsExpanded: result.filmographyActorsExpanded,
      filmographyMovieShellsCreated: result.filmographyMovieShellsCreated,
      added: result.exists ? 0 : 1,
      synced: result.exists ? 1 : 0,
      skipped: 0,
      failed: 0,
    }
  } catch (error) {
    return {
      result: {
        tmdbId: hit.tmdbId,
        title: hit.title,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
        track: opts.track,
      },
      filmographyActorsExpanded: 0,
      filmographyMovieShellsCreated: 0,
      added: 0,
      synced: 0,
      skipped: 0,
      failed: 1,
    }
  }
}

/**
 * Daily Coolify catalog sync — two tracks:
 * 1) Theatrical: now-playing + recent releases (strict popularity + votes)
 * 2) Upcoming/festival: future releases (lower popularity floor, no vote floor)
 */
export async function runDailyCatalogSync(
  prisma: PrismaClient,
): Promise<DailyCatalogSyncResult> {
  const region = (process.env.CATALOG_SYNC_REGION || "US").trim() || "US"
  const maxMovies = envInt("CATALOG_SYNC_MAX_MOVIES", 12, 1, 40)
  const maxUpcoming = envInt("CATALOG_SYNC_MAX_UPCOMING", 4, 0, 20)
  const maxFilmographyActors = envInt("CATALOG_SYNC_MAX_FILMOGRAPHY_ACTORS", 8, 0, 40)
  const maxBillingOrder = envInt("CATALOG_SYNC_MAX_BILLING_ORDER", 12, 0, 50)
  const incompleteTake = envInt("CATALOG_SYNC_INCOMPLETE_TAKE", 8, 0, 40)
  const recentDays = envInt("CATALOG_SYNC_RECENT_DAYS", 14, 1, 60)
  const futureDays = envInt("CATALOG_SYNC_FUTURE_DAYS", 180, 30, 365)
  const minPopularity = envInt("CATALOG_SYNC_MIN_POPULARITY", 15, 0, 200)
  const upcomingMinPopularity = envInt(
    "CATALOG_SYNC_UPCOMING_MIN_POPULARITY",
    5,
    0,
    200,
  )
  const minVoteCount = envInt("CATALOG_SYNC_MIN_VOTE_COUNT", 50, 0, 5000)
  const minCastSize = envInt("CATALOG_SYNC_MIN_CAST", 5, 1, 50)

  const [nowPlaying, upcomingPage1, upcomingPage2, recent, futurePage1, futurePage2] =
    await Promise.all([
      fetchTmdbNowPlaying({ region, page: 1 }),
      fetchTmdbUpcoming({ region, page: 1 }),
      fetchTmdbUpcoming({ region, page: 2 }),
      fetchTmdbRecentReleases({ region, daysBack: recentDays, page: 1 }),
      fetchTmdbFutureReleases({ region, daysAhead: futureDays, page: 1 }),
      fetchTmdbFutureReleases({ region, daysAhead: futureDays, page: 2 }),
    ])

  const theatricalPool = new Map<number, TmdbDiscoverMovie>()
  mergeHits(theatricalPool, nowPlaying)
  mergeHits(theatricalPool, recent)

  const upcomingPool = new Map<number, TmdbDiscoverMovie>()
  mergeHits(upcomingPool, upcomingPage1)
  mergeHits(upcomingPool, upcomingPage2)
  mergeHits(upcomingPool, futurePage1)
  mergeHits(upcomingPool, futurePage2)

  const discovered = new Set([
    ...theatricalPool.keys(),
    ...upcomingPool.keys(),
  ]).size

  const theatricalRanked = [...theatricalPool.values()]
    .filter(
      (hit) =>
        shouldSkipDiscoverHit(hit, { minPopularity, minVoteCount }) == null,
    )
    .sort((a, b) => b.popularity - a.popularity)

  const upcomingRanked = [...upcomingPool.values()]
    .filter(
      (hit) =>
        shouldSkipDiscoverHit(hit, {
          minPopularity: upcomingMinPopularity,
          minVoteCount: 0,
          requireFuture: true,
        }) == null,
    )
    // Prefer nearer releases, then popularity.
    .sort((a, b) => {
      const da = a.releaseDate ?? "9999"
      const db = b.releaseDate ?? "9999"
      if (da !== db) return da.localeCompare(db)
      return b.popularity - a.popularity
    })

  const movies: CatalogSyncMovieResult[] = []
  let added = 0
  let synced = 0
  let skipped = 0
  let failed = 0
  let filmographyActorsExpanded = 0
  let filmographyMovieShellsCreated = 0
  let processed = 0
  const seenTmdbIds = new Set<number>()

  const ingestOpts = {
    maxFilmographyActors,
    maxBillingOrder,
    minVoteCount,
    minCastSize,
  }

  for (const hit of theatricalRanked) {
    if (processed >= maxMovies) break
    if (seenTmdbIds.has(hit.tmdbId)) continue

    const existing = await prisma.movie.findUnique({
      where: { tmdbId: hit.tmdbId },
      select: { castIngestedAt: true },
    })
    if (existing?.castIngestedAt) {
      seenTmdbIds.add(hit.tmdbId)
      skipped += 1
      movies.push({
        tmdbId: hit.tmdbId,
        title: hit.title,
        status: "skipped",
        reason: "already_ingested",
        track: "theatrical",
      })
      continue
    }

    seenTmdbIds.add(hit.tmdbId)
    processed += 1
    const outcome = await ingestHit(prisma, hit, {
      ...ingestOpts,
      track: "theatrical",
    })
    movies.push(outcome.result)
    added += outcome.added
    synced += outcome.synced
    skipped += outcome.skipped
    failed += outcome.failed
    filmographyActorsExpanded += outcome.filmographyActorsExpanded
    filmographyMovieShellsCreated += outcome.filmographyMovieShellsCreated
  }

  let upcomingSucceeded = 0
  let upcomingAttempts = 0
  const upcomingAttemptCap = Math.max(maxUpcoming * 8, 24)
  for (const hit of upcomingRanked) {
    if (upcomingSucceeded >= maxUpcoming) break
    if (upcomingAttempts >= upcomingAttemptCap) break
    if (seenTmdbIds.has(hit.tmdbId)) continue

    const existing = await prisma.movie.findUnique({
      where: { tmdbId: hit.tmdbId },
      select: { castIngestedAt: true },
    })
    if (existing?.castIngestedAt) {
      seenTmdbIds.add(hit.tmdbId)
      skipped += 1
      movies.push({
        tmdbId: hit.tmdbId,
        title: hit.title,
        status: "skipped",
        reason: "already_ingested",
        track: "upcoming",
      })
      continue
    }

    seenTmdbIds.add(hit.tmdbId)
    upcomingAttempts += 1
    processed += 1
    const outcome = await ingestHit(prisma, hit, {
      ...ingestOpts,
      track: "upcoming",
    })
    movies.push(outcome.result)
    added += outcome.added
    synced += outcome.synced
    skipped += outcome.skipped
    failed += outcome.failed
    filmographyActorsExpanded += outcome.filmographyActorsExpanded
    filmographyMovieShellsCreated += outcome.filmographyMovieShellsCreated
    // Only successful adds/syncs consume the upcoming quota (shorts/failures don't).
    if (outcome.added > 0 || outcome.synced > 0) {
      upcomingSucceeded += 1
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
    candidates: theatricalRanked.length,
    upcomingCandidates: upcomingRanked.length,
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
