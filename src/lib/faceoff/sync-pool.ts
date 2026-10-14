import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getActorUrl, getRateUrl } from "@/lib/slugHelper"
import { CURATED_ACTOR_NAMES, CURATED_PERFORMANCES } from "@/lib/faceoff/curated-pool"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import { upgradeFaceOffImage } from "@/lib/faceoff/images"

type PerformanceRow = {
  id: string
  character: string | null
  actorId: string
  actorName: string
  actorImage: string | null
  actorSlug: string | null
  movieId: string
  movieTitle: string
  movieYear: number
  movieSlug: string | null
  posterUrl: string | null
  genre: string | null
  popularity: number
}

function performanceMetadata(row: PerformanceRow, portraitUrl: string | null, posterUrl: string | null) {
  return {
    actorId: row.actorId,
    movieId: row.movieId,
    year: row.movieYear,
    genre: row.genre,
    character: row.character,
    filmTitle: row.movieTitle,
    href: getRateUrl(
      { id: row.actorId, name: row.actorName, slug: row.actorSlug },
      { id: row.movieId, title: row.movieTitle, year: row.movieYear, slug: row.movieSlug },
    ),
    portraitUrl,
    posterUrl,
  }
}

async function upsertPerformance(row: PerformanceRow): Promise<void> {
  const portraitUrl = upgradeFaceOffImage(row.actorImage, "actor")
  const posterUrl = upgradeFaceOffImage(row.posterUrl, "poster")
  const imageUrl = portraitUrl ?? posterUrl
  if (!imageUrl) return
  const subtitle = row.character ? `${row.character} · ${row.movieYear}` : String(row.movieYear)
  const metadata = performanceMetadata(row, portraitUrl, posterUrl)
  await prisma.faceOffEntity.upsert({
    where: { performanceId: row.id },
    create: {
      entityType: "PERFORMANCE",
      performanceId: row.id,
      displayName: row.actorName,
      imageUrl,
      subtitle,
      metadata,
      popularity: row.popularity,
      eligible: true,
    },
    update: {
      displayName: row.actorName,
      imageUrl,
      subtitle,
      metadata,
      popularity: row.popularity,
      eligible: true,
    },
  })
}

async function loadCuratedPerformances(): Promise<PerformanceRow[]> {
  const actorNames = [...new Set(CURATED_PERFORMANCES.map((row) => row.actor))]
  const movieTitles = [...new Set(CURATED_PERFORMANCES.map((row) => row.movie))]
  const [actors, movies] = await Promise.all([
    prisma.actor.findMany({
      where: { name: { in: actorNames } },
      select: { id: true, name: true, imageUrl: true, slug: true },
    }),
    prisma.movie.findMany({
      where: { title: { in: movieTitles }, isFeaturette: false },
      select: { id: true, title: true, year: true, slug: true, posterUrl: true, genre: true, tmdbVoteCount: true },
    }),
  ])
  if (actors.length === 0 || movies.length === 0) return []
  const performances = await prisma.performance.findMany({
    where: {
      userId: SYSTEM_USER_ID,
      actorId: { in: actors.map((actor) => actor.id) },
      movieId: { in: movies.map((movie) => movie.id) },
    },
    select: {
      id: true,
      character: true,
      actorId: true,
      movieId: true,
      actor: { select: { name: true, imageUrl: true, slug: true } },
      movie: { select: { title: true, year: true, slug: true, posterUrl: true, genre: true, tmdbVoteCount: true } },
    },
  })
  const wanted = new Set(CURATED_PERFORMANCES.map((row) => `${row.actor}|${row.movie}|${row.year}`))
  return performances
    .filter((row) => wanted.has(`${row.actor.name}|${row.movie.title}|${row.movie.year}`))
    .map((row) => ({
      id: row.id,
      character: row.character,
      actorId: row.actorId,
      actorName: row.actor.name,
      actorImage: row.actor.imageUrl,
      actorSlug: row.actor.slug,
      movieId: row.movieId,
      movieTitle: row.movie.title,
      movieYear: row.movie.year,
      movieSlug: row.movie.slug,
      posterUrl: row.movie.posterUrl,
      genre: row.movie.genre,
      popularity: row.movie.tmdbVoteCount ?? 0,
    }))
}

async function loadQualityPerformances(): Promise<PerformanceRow[]> {
  const rows = await prisma.$queryRaw<PerformanceRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.character,
      a.id AS "actorId",
      a.name AS "actorName",
      a."imageUrl" AS "actorImage",
      a.slug AS "actorSlug",
      m.id AS "movieId",
      m.title AS "movieTitle",
      m.year AS "movieYear",
      m.slug AS "movieSlug",
      m."posterUrl" AS "posterUrl",
      m.genre,
      (
        COALESCE(m."tmdbVoteCount", 0)::float
        + COALESCE(rc.cnt, 0)::float * 25
      ) AS popularity
    FROM "Performance" p
    JOIN "Actor" a ON a.id = p."actorId"
    JOIN "Movie" m ON m.id = p."movieId"
    LEFT JOIN (
      SELECT "actorId", "movieId", COUNT(*)::int AS cnt
      FROM "Rating"
      GROUP BY "actorId", "movieId"
    ) rc ON rc."actorId" = p."actorId" AND rc."movieId" = p."movieId"
    WHERE p."userId" = ${SYSTEM_USER_ID}
      AND p.tier = 'LEAD'::"PerformanceTier"
      AND m."isFeaturette" = false
      AND a."imageUrl" IS NOT NULL
      AND m."posterUrl" IS NOT NULL
    ORDER BY popularity DESC, p."seededAggregateScore" DESC NULLS LAST
    LIMIT 220
  `)
  return rows
}

async function upsertActorsFromPerformances(rows: PerformanceRow[]): Promise<void> {
  const byActor = new Map<string, PerformanceRow>()
  for (const row of rows) {
    if (!byActor.has(row.actorId)) byActor.set(row.actorId, row)
  }
  const named = await prisma.actor.findMany({
    where: { name: { in: [...CURATED_ACTOR_NAMES] }, imageUrl: { not: null } },
    select: { id: true, name: true, imageUrl: true, slug: true, knownFor: true },
  })
  for (const actor of named) {
    if (byActor.has(actor.id)) continue
    byActor.set(actor.id, {
      id: "",
      character: null,
      actorId: actor.id,
      actorName: actor.name,
      actorImage: actor.imageUrl,
      actorSlug: actor.slug,
      movieId: "",
      movieTitle: actor.knownFor ?? "",
      movieYear: 0,
      movieSlug: null,
      posterUrl: null,
      genre: null,
      popularity: 1,
    })
  }

  for (const row of byActor.values()) {
    const imageUrl = upgradeFaceOffImage(row.actorImage, "actor")
    if (!imageUrl) continue
    const subtitle = row.movieTitle ? `Known for ${row.movieTitle}` : "Actor"
    await prisma.faceOffEntity.upsert({
      where: { actorId: row.actorId },
      create: {
        entityType: "ACTOR",
        actorId: row.actorId,
        displayName: row.actorName,
        imageUrl,
        subtitle,
        popularity: Math.max(row.popularity, 1),
        metadata: {
          href: getActorUrl({ id: row.actorId, name: row.actorName, slug: row.actorSlug }),
        },
        eligible: true,
      },
      update: {
        displayName: row.actorName,
        imageUrl,
        subtitle,
        popularity: Math.max(row.popularity, 1),
        metadata: {
          href: getActorUrl({ id: row.actorId, name: row.actorName, slug: row.actorSlug }),
        },
        eligible: true,
      },
    })
  }
}

let inflight: Promise<{ performances: number; actors: number }> | null = null

/** Idempotent. Updates display fields and never writes Elo or comparison counts. */
export async function syncFaceOffPool(): Promise<{ performances: number; actors: number }> {
  if (inflight) return inflight
  inflight = (async () => {
    const [curated, quality] = await Promise.all([
      loadCuratedPerformances(),
      loadQualityPerformances(),
    ])
    const merged = new Map<string, PerformanceRow>()
    for (const row of [...curated, ...quality]) merged.set(row.id, row)
    const performances = [...merged.values()]
    for (const row of performances) {
      await upsertPerformance(row)
    }
    await upsertActorsFromPerformances(performances)
    const [performanceCount, actorCount] = await Promise.all([
      prisma.faceOffEntity.count({ where: { entityType: "PERFORMANCE", eligible: true } }),
      prisma.faceOffEntity.count({ where: { entityType: "ACTOR", eligible: true } }),
    ])
    return { performances: performanceCount, actors: actorCount }
  })().finally(() => {
    inflight = null
  })
  return inflight
}

export async function ensureFaceOffPool(): Promise<void> {
  const [actors, performances] = await Promise.all([
    prisma.faceOffEntity.count({ where: { entityType: "ACTOR", eligible: true } }),
    prisma.faceOffEntity.count({ where: { entityType: "PERFORMANCE", eligible: true } }),
  ])
  if (actors >= 12 && performances >= 12) return
  await syncFaceOffPool()
}
