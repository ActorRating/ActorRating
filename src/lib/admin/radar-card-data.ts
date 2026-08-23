import { Prisma, type PrismaClient } from "@prisma/client"
import { normalizeRadarAxes, type RadarAxisScores } from "@/lib/share/radarCardSvg"

const DIM_FIELDS = [
  "emotionalRangeDepth",
  "characterBelievability",
  "technicalSkill",
  "screenPresence",
  "chemistryInteraction",
] as const

export type RatedPerformanceSearchItem = {
  actorId: string
  movieId: string
  actorName: string
  actorSlug: string | null
  actorImageUrl: string | null
  movieTitle: string
  movieYear: number
  movieSlug: string | null
  ratingCount: number
  avgScore10: number | null
}

export type PerformanceRatingOption = {
  id: string
  username: string
  score10: number
  createdAt: string
}

export type RadarCardPayload = {
  actorId: string
  movieId: string
  actorName: string
  movieTitle: string
  movieYear: number
  roleName: string | null
  username: string
  score100: number
  scoreOutOf10: string
  ratingCount: number
  source: "community" | "rating"
  ratingId?: string
  axes: RadarAxisScores
  actorImageUrl: string | null
  quote: string | null
}

function avgDim100(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

export async function searchRatedPerformances(
  prisma: PrismaClient,
  opts: { q?: string; limit?: number; offset?: number } = {},
): Promise<{ items: RatedPerformanceSearchItem[]; total: number }> {
  const q = opts.q?.trim() || ""
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100)
  const offset = Math.max(opts.offset ?? 0, 0)
  const qPattern = q ? `%${q}%` : null
  const searchFilter = qPattern
    ? Prisma.sql`AND (
        a.name ILIKE ${qPattern}
        OR a.slug ILIKE ${qPattern}
        OR m.title ILIKE ${qPattern}
        OR m.slug ILIKE ${qPattern}
      )`
    : Prisma.empty

  const [countRows, items] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*)::bigint AS total
      FROM (
        SELECT DISTINCT r."actorId", r."movieId"
        FROM "Rating" r
        JOIN "Actor" a ON a.id = r."actorId"
        JOIN "Movie" m ON m.id = r."movieId"
        WHERE r."userId" IS NOT NULL
          AND NOT m."isFeaturette"
          ${searchFilter}
      ) pairs
    `,
    prisma.$queryRaw<
      Array<{
        actorId: string
        movieId: string
        actorName: string
        actorSlug: string | null
        actorImageUrl: string | null
        movieTitle: string
        movieYear: number
        movieSlug: string | null
        ratingCount: number
        avgScore100: number | null
      }>
    >`
      SELECT
        r."actorId",
        r."movieId",
        a.name AS "actorName",
        a.slug AS "actorSlug",
        a."imageUrl" AS "actorImageUrl",
        m.title AS "movieTitle",
        m.year AS "movieYear",
        m.slug AS "movieSlug",
        COUNT(*)::int AS "ratingCount",
        ROUND(AVG(r."weightedScore")::numeric, 1)::float AS "avgScore100"
      FROM "Rating" r
      JOIN "Actor" a ON a.id = r."actorId"
      JOIN "Movie" m ON m.id = r."movieId"
      WHERE r."userId" IS NOT NULL
        AND NOT m."isFeaturette"
        ${searchFilter}
      GROUP BY r."actorId", r."movieId", a.name, a.slug, a."imageUrl", m.title, m.year, m.slug
      ORDER BY "ratingCount" DESC, a.name ASC, m.title ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `,
  ])

  return {
    total: Number(countRows[0]?.total ?? 0),
    items: items.map((row) => ({
      actorId: row.actorId,
      movieId: row.movieId,
      actorName: row.actorName,
      actorSlug: row.actorSlug,
      actorImageUrl: row.actorImageUrl,
      movieTitle: row.movieTitle,
      movieYear: row.movieYear,
      movieSlug: row.movieSlug,
      ratingCount: row.ratingCount,
      avgScore10:
        typeof row.avgScore100 === "number" && row.avgScore100 > 0
          ? Number((row.avgScore100 / 10).toFixed(1))
          : null,
    })),
  }
}

export async function listRatingsForPerformance(
  prisma: PrismaClient,
  actorId: string,
  movieId: string,
): Promise<PerformanceRatingOption[]> {
  const ratings = await prisma.rating.findMany({
    where: { actorId, movieId, userId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      weightedScore: true,
      shareScore: true,
      createdAt: true,
      user: { select: { username: true, name: true } },
    },
  })

  return ratings.map((r) => ({
    id: r.id,
    username: r.user?.username ? `@${r.user.username}` : r.user?.name?.trim() || "User",
    score10: Number(((r.shareScore ?? r.weightedScore ?? 0) / 10).toFixed(1)),
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function getRadarCardPayload(
  prisma: PrismaClient,
  actorId: string,
  movieId: string,
  ratingId?: string | null,
): Promise<RadarCardPayload | null> {
  const [actor, movie, performance] = await Promise.all([
    prisma.actor.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, imageUrl: true },
    }),
    prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true, title: true, year: true },
    }),
    prisma.performance.findFirst({
      where: { actorId, movieId },
      select: { character: true },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  if (!actor || !movie) return null

  if (ratingId) {
    const rating = await prisma.rating.findFirst({
      where: { id: ratingId, actorId, movieId, userId: { not: null } },
      include: { user: { select: { username: true, name: true } } },
    })
    if (!rating) return null

    const score100 = Math.round(rating.shareScore ?? rating.weightedScore ?? 0)
    const axes = normalizeRadarAxes(
      {
        emotionalRangeDepth: rating.emotionalRangeDepth,
        characterBelievability: rating.characterBelievability,
        technicalSkill: rating.technicalSkill,
        screenPresence: rating.screenPresence,
        chemistryInteraction: rating.chemistryInteraction,
      },
      score100,
    )

    return {
      actorId,
      movieId,
      actorName: actor.name,
      movieTitle: movie.title,
      movieYear: movie.year,
      roleName: rating.roleName || performance?.character || null,
      username: rating.user?.username
        ? `@${rating.user.username}`
        : rating.user?.name?.trim() || "User",
      score100,
      scoreOutOf10: (score100 / 10).toFixed(1),
      ratingCount: 1,
      source: "rating",
      ratingId: rating.id,
      axes,
      actorImageUrl: actor.imageUrl,
      quote:
        rating.comment?.trim() && !rating.commentHidden && !rating.isSpoiler
          ? rating.comment.trim()
          : null,
    }
  }

  const ratings = await prisma.rating.findMany({
    where: { actorId, movieId, userId: { not: null } },
    select: {
      emotionalRangeDepth: true,
      characterBelievability: true,
      technicalSkill: true,
      screenPresence: true,
      chemistryInteraction: true,
      weightedScore: true,
      roleName: true,
    },
  })

  if (!ratings.length) return null

  const dimAvgs: Partial<RadarAxisScores> = {}
  for (const field of DIM_FIELDS) {
    const vals = ratings.map((r) => r[field]).filter((v): v is number => typeof v === "number")
    const avg = avgDim100(vals)
    dimAvgs[field] = avg ?? 0
  }

  const score100 = Math.round(
    ratings.reduce((s, r) => s + (typeof r.weightedScore === "number" ? r.weightedScore : 0), 0) /
      ratings.length,
  )
  const axes = normalizeRadarAxes(dimAvgs, score100)
  const roleName =
    ratings.find((r) => r.roleName?.trim())?.roleName?.trim() || performance?.character || null

  return {
    actorId,
    movieId,
    actorName: actor.name,
    movieTitle: movie.title,
    movieYear: movie.year,
    roleName,
    username: "Community",
    score100,
    scoreOutOf10: (score100 / 10).toFixed(1),
    ratingCount: ratings.length,
    source: "community",
    axes,
    actorImageUrl: actor.imageUrl,
    quote: null,
  }
}
