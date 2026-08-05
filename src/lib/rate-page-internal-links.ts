import type { PrismaClient } from "@prisma/client"
import { createSlug } from "@/lib/createSlug"
import { isRatePageIndexable } from "@/lib/rate-page-seo"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"

export type CraftDimensionKey =
  | "emotionalRangeDepth"
  | "characterBelievability"
  | "technicalSkill"
  | "screenPresence"
  | "chemistryInteraction"

export const CRAFT_DIMENSIONS: Array<{
  key: CraftDimensionKey
  slug: string
  label: string
  shortLabel: string
}> = [
  {
    key: "emotionalRangeDepth",
    slug: "emotional-range",
    label: "Emotional Range & Depth",
    shortLabel: "Emotional Impact",
  },
  {
    key: "screenPresence",
    slug: "screen-presence",
    label: "Screen Presence & Impact",
    shortLabel: "Screen Presence",
  },
  {
    key: "characterBelievability",
    slug: "character-believability",
    label: "Character Believability",
    shortLabel: "Character Believability",
  },
  {
    key: "technicalSkill",
    slug: "technical-skill",
    label: "Technical Skill",
    shortLabel: "Technical Skill",
  },
  {
    key: "chemistryInteraction",
    slug: "chemistry-interaction",
    label: "Chemistry & Interaction",
    shortLabel: "Chemistry",
  },
]

export function craftDimensionFromSlug(slug: string) {
  return CRAFT_DIMENSIONS.find((d) => d.slug === slug) ?? null
}

export type SeoLinkItem = {
  href: string
  label: string
  subtitle?: string
}

export type RatePageInternalLinks = {
  entity: SeoLinkItem[]
  sameMovie: SeoLinkItem[]
  similarByCraft: Array<{ dimensionLabel: string; dimensionSlug: string; items: SeoLinkItem[] }>
  higherRated: SeoLinkItem[]
  lowerRated: SeoLinkItem[]
  craftHubs: SeoLinkItem[]
}

function parseGenres(genre: string | null | undefined): string[] {
  if (!genre?.trim()) return []
  return genre
    .split(/[,|/]/)
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 4)
}

type ScoreRow = {
  actorId: string
  movieId: string
  actorName: string
  actorSlug: string | null
  movieTitle: string
  movieSlug: string | null
  movieYear: number
  avgScore: number
  dimScore: number | null
  tier: string | null
  seeded: number | null
  cohort: number
  ratingCount: number
}

function toLink(row: ScoreRow, subtitle: string): SeoLinkItem {
  return {
    href: `/rate/${row.movieSlug ?? row.movieId}/${row.actorSlug ?? row.actorId}`,
    label: `${row.actorName} in ${row.movieTitle}`,
    subtitle,
  }
}

function keepIndexable(rows: ScoreRow[]) {
  return rows.filter((row) =>
    isRatePageIndexable({
      movieSlug: row.movieSlug,
      movieTitle: row.movieTitle,
      indexingCohort: row.cohort,
      seededAggregateScore: row.seeded,
      communityRatingCount: row.ratingCount,
      tier: row.tier,
    }),
  )
}

async function topByDimension(
  prisma: PrismaClient,
  column: CraftDimensionKey,
  excludeActorId: string,
  excludeMovieId: string,
  take = 6,
): Promise<ScoreRow[]> {
  // column is from a fixed allowlist — safe to interpolate into identifier position.
  const rows = await prisma.$queryRawUnsafe<ScoreRow[]>(
    `
    SELECT
      p."actorId" AS "actorId",
      p."movieId" AS "movieId",
      a.name AS "actorName",
      a.slug AS "actorSlug",
      m.title AS "movieTitle",
      m.slug AS "movieSlug",
      m.year AS "movieYear",
      COALESCE(p."seededAggregateScore", 0)::float AS "avgScore",
      (
        SELECT AVG(r."${column}") / 10.0
        FROM "Rating" r
        WHERE r."actorId" = p."actorId" AND r."movieId" = p."movieId" AND r."userId" IS NOT NULL
      )::float AS "dimScore",
      p.tier::text AS tier,
      p."seededAggregateScore"::float AS seeded,
      m."indexingCohort" AS cohort,
      (
        SELECT COUNT(*)::int FROM "Rating" r2
        WHERE r2."actorId" = p."actorId" AND r2."movieId" = p."movieId" AND r2."userId" IS NOT NULL
      ) AS "ratingCount"
    FROM "Performance" p
    INNER JOIN "Actor" a ON a.id = p."actorId"
    INNER JOIN "Movie" m ON m.id = p."movieId"
    WHERE p."userId" = $1
      AND p.tier IN ('LEAD', 'SUPPORTING')
      AND NOT m."isFeaturette"
      AND NOT (p."actorId" = $2 AND p."movieId" = $3)
      AND EXISTS (
        SELECT 1 FROM "Rating" r
        WHERE r."actorId" = p."actorId" AND r."movieId" = p."movieId" AND r."userId" IS NOT NULL
      )
    ORDER BY (
      SELECT AVG(r."${column}")
      FROM "Rating" r
      WHERE r."actorId" = p."actorId" AND r."movieId" = p."movieId" AND r."userId" IS NOT NULL
    ) DESC NULLS LAST
    LIMIT 30
    `,
    SYSTEM_USER_ID,
    excludeActorId,
    excludeMovieId,
  )
  return keepIndexable(rows).slice(0, take)
}

/**
 * Build crawlable internal links for a rate page (SSR).
 */
export async function getRatePageInternalLinks(
  prisma: PrismaClient,
  input: {
    actorId: string
    movieId: string
    actorName: string
    actorSlug: string | null
    movieTitle: string
    movieSlug: string | null
    movieYear: number
    director: string | null
    genre: string | null
  },
): Promise<RatePageInternalLinks> {
  const entity: SeoLinkItem[] = [
    {
      href: `/actors/${input.actorSlug ?? input.actorId}`,
      label: input.actorName,
      subtitle: "Actor page",
    },
    {
      href: `/movies/${input.movieSlug ?? input.movieId}`,
      label: `${input.movieTitle} (${input.movieYear})`,
      subtitle: "Movie page",
    },
  ]

  const director = input.director?.trim()
  if (director && director.toLowerCase() !== "unknown") {
    entity.push({
      href: `/directors/${createSlug(director)}`,
      label: director,
      subtitle: "Director",
    })
  }

  for (const g of parseGenres(input.genre)) {
    entity.push({
      href: `/genres/${createSlug(g)}`,
      label: g,
      subtitle: "Genre",
    })
  }

  // Awards / franchise hubs are not modeled yet — forum is the crawlable stand-in.
  entity.push({
    href: "/forum",
    label: "Awards & craft debates",
    subtitle: "Forum · snubs, franchises, craft talk",
  })

  const cast = await prisma.performance.findMany({
    where: {
      movieId: input.movieId,
      actorId: { not: input.actorId },
      tier: { in: ["LEAD", "SUPPORTING"] },
      userId: SYSTEM_USER_ID,
    },
    orderBy: [{ order: "asc" }],
    take: 12,
    select: {
      tier: true,
      seededAggregateScore: true,
      actor: { select: { id: true, name: true, slug: true } },
      movie: {
        select: {
          id: true,
          title: true,
          slug: true,
          indexingCohort: true,
        },
      },
    },
  })

  const castCounts =
    cast.length === 0
      ? []
      : await prisma.rating.groupBy({
          by: ["actorId"],
          where: {
            movieId: input.movieId,
            actorId: { in: cast.map((c) => c.actor.id) },
            userId: { not: null },
          },
          _count: { _all: true },
        })
  const castCountByActor = new Map(castCounts.map((c) => [c.actorId, c._count._all]))

  const sameMovie: SeoLinkItem[] = []
  for (const row of cast) {
    const count = castCountByActor.get(row.actor.id) ?? 0
    if (
      !isRatePageIndexable({
        movieSlug: row.movie.slug,
        movieTitle: row.movie.title,
        indexingCohort: row.movie.indexingCohort,
        seededAggregateScore: row.seededAggregateScore,
        communityRatingCount: count,
        tier: row.tier,
      })
    ) {
      continue
    }
    sameMovie.push({
      href: `/rate/${row.movie.slug ?? row.movie.id}/${row.actor.slug ?? row.actor.id}`,
      label: row.actor.name,
      subtitle: `Also in ${row.movie.title}`,
    })
    if (sameMovie.length >= 6) break
  }

  const ranked = await prisma.$queryRaw<ScoreRow[]>`
    SELECT
      p."actorId" AS "actorId",
      p."movieId" AS "movieId",
      a.name AS "actorName",
      a.slug AS "actorSlug",
      m.title AS "movieTitle",
      m.slug AS "movieSlug",
      m.year AS "movieYear",
      COALESCE(
        (
          SELECT AVG(
            (r."emotionalRangeDepth" + r."characterBelievability" + r."technicalSkill"
              + r."screenPresence" + r."chemistryInteraction") / 50.0
          )
          FROM "Rating" r
          WHERE r."actorId" = p."actorId" AND r."movieId" = p."movieId" AND r."userId" IS NOT NULL
        ),
        p."seededAggregateScore",
        0
      )::float AS "avgScore",
      NULL::float AS "dimScore",
      p.tier::text AS tier,
      p."seededAggregateScore"::float AS seeded,
      m."indexingCohort" AS cohort,
      (
        SELECT COUNT(*)::int FROM "Rating" r2
        WHERE r2."actorId" = p."actorId" AND r2."movieId" = p."movieId" AND r2."userId" IS NOT NULL
      ) AS "ratingCount"
    FROM "Performance" p
    INNER JOIN "Actor" a ON a.id = p."actorId"
    INNER JOIN "Movie" m ON m.id = p."movieId"
    WHERE p."userId" = ${SYSTEM_USER_ID}
      AND p.tier IN ('LEAD', 'SUPPORTING')
      AND NOT m."isFeaturette"
      AND NOT (p."actorId" = ${input.actorId} AND p."movieId" = ${input.movieId})
      AND (
        m."indexingCohort" = 1
        OR EXISTS (
          SELECT 1 FROM "Rating" r
          WHERE r."actorId" = p."actorId" AND r."movieId" = p."movieId" AND r."userId" IS NOT NULL
        )
      )
    ORDER BY COALESCE(
      (
        SELECT AVG(
          (r."emotionalRangeDepth" + r."characterBelievability" + r."technicalSkill"
            + r."screenPresence" + r."chemistryInteraction") / 50.0
        )
        FROM "Rating" r
        WHERE r."actorId" = p."actorId" AND r."movieId" = p."movieId" AND r."userId" IS NOT NULL
      ),
      p."seededAggregateScore",
      0
    ) DESC NULLS LAST
    LIMIT 40
  `

  const indexableRanked = keepIndexable(ranked)
  const current = await prisma.$queryRaw<Array<{ avgScore: number }>>`
    SELECT COALESCE(
      (
        SELECT AVG(
          (r."emotionalRangeDepth" + r."characterBelievability" + r."technicalSkill"
            + r."screenPresence" + r."chemistryInteraction") / 50.0
        )
        FROM "Rating" r
        WHERE r."actorId" = ${input.actorId}
          AND r."movieId" = ${input.movieId}
          AND r."userId" IS NOT NULL
      ),
      (
        SELECT p."seededAggregateScore"
        FROM "Performance" p
        WHERE p."actorId" = ${input.actorId}
          AND p."movieId" = ${input.movieId}
          AND p."userId" = ${SYSTEM_USER_ID}
        LIMIT 1
      ),
      0
    )::float AS "avgScore"
  `
  const currentScore = current[0]?.avgScore ?? 0

  // Closest peers just above / just below this score (better crawl paths than site-wide extremes).
  const higherRated = indexableRanked
    .filter((r) => r.avgScore > currentScore)
    .slice(-6)
    .reverse()
    .map((r) => toLink(r, `Higher rated · ${r.avgScore.toFixed(1)}/10`))

  const lowerRated = indexableRanked
    .filter((r) => r.avgScore > 0 && r.avgScore < currentScore)
    .slice(0, 6)
    .map((r) => toLink(r, `Lower rated · ${r.avgScore.toFixed(1)}/10`))

  const [emo, screen] = await Promise.all([
    topByDimension(prisma, "emotionalRangeDepth", input.actorId, input.movieId),
    topByDimension(prisma, "screenPresence", input.actorId, input.movieId),
  ])

  const similarByCraft = [
    {
      dimensionLabel: "Emotional Impact",
      dimensionSlug: "emotional-range",
      items: emo.map((r) =>
        toLink(r, `Emotional impact · ${(r.dimScore ?? r.avgScore).toFixed(1)}/10`),
      ),
    },
    {
      dimensionLabel: "Screen Presence",
      dimensionSlug: "screen-presence",
      items: screen.map((r) =>
        toLink(r, `Screen presence · ${(r.dimScore ?? r.avgScore).toFixed(1)}/10`),
      ),
    },
  ]

  const craftHubs = CRAFT_DIMENSIONS.map((d) => ({
    href: `/craft/${d.slug}`,
    label: `Highest ${d.shortLabel} performances`,
    subtitle: d.label,
  }))

  return {
    entity,
    sameMovie,
    similarByCraft,
    higherRated,
    lowerRated,
    craftHubs,
  }
}
