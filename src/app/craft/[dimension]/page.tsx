import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  craftDimensionFromSlug,
  CRAFT_DIMENSIONS,
} from "@/lib/rate-page-internal-links"
import { isRatePageIndexable } from "@/lib/rate-page-seo"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import { HomeLayout } from "@/components/layout"

export const revalidate = 1800

const BASE = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

type Props = { params: Promise<{ dimension: string }> }

type Row = {
  actorId: string
  movieId: string
  actorName: string
  actorSlug: string | null
  movieTitle: string
  movieSlug: string | null
  movieYear: number
  dimScore: number
  tier: string | null
  seeded: number | null
  cohort: number
  ratingCount: number
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dimension } = await params
  const dim = craftDimensionFromSlug(dimension)
  if (!dim) {
    return { title: "Craft leaderboard", robots: { index: false, follow: true } }
  }
  return {
    title: `Highest ${dim.shortLabel} Performances`,
    description: `Discover acting performances with the highest community ${dim.label} scores on ActorRating.`,
    alternates: { canonical: `${BASE}/craft/${dim.slug}` },
  }
}

export default async function CraftLeaderboardPage({ params }: Props) {
  const { dimension } = await params
  const dim = craftDimensionFromSlug(dimension)
  if (!dim) notFound()

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `
    SELECT
      p."actorId" AS "actorId",
      p."movieId" AS "movieId",
      a.name AS "actorName",
      a.slug AS "actorSlug",
      m.title AS "movieTitle",
      m.slug AS "movieSlug",
      m.year AS "movieYear",
      (
        SELECT AVG(r."${dim.key}") / 10.0
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
      AND EXISTS (
        SELECT 1 FROM "Rating" r
        WHERE r."actorId" = p."actorId" AND r."movieId" = p."movieId" AND r."userId" IS NOT NULL
      )
    ORDER BY (
      SELECT AVG(r."${dim.key}")
      FROM "Rating" r
      WHERE r."actorId" = p."actorId" AND r."movieId" = p."movieId" AND r."userId" IS NOT NULL
    ) DESC NULLS LAST
    LIMIT 60
    `,
    SYSTEM_USER_ID,
  )

  const items = rows
    .filter((row) =>
      isRatePageIndexable({
        movieSlug: row.movieSlug,
        movieTitle: row.movieTitle,
        indexingCohort: row.cohort,
        seededAggregateScore: row.seeded,
        communityRatingCount: row.ratingCount,
        tier: row.tier,
      }),
    )
    .slice(0, 40)

  return (
    <HomeLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Craft leaderboard
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Highest {dim.shortLabel} performances
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          Ranked by community averages for {dim.label}. Rate more performances to sharpen the
          leaderboard.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {CRAFT_DIMENSIONS.map((d) => (
            <Link
              key={d.slug}
              href={`/craft/${d.slug}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                d.slug === dim.slug
                  ? "border-[#FFD700] text-[#FFD700]"
                  : "border-white/15 text-zinc-400 hover:border-white/30"
              }`}
            >
              {d.shortLabel}
            </Link>
          ))}
        </div>

        <ol className="mt-8 space-y-2">
          {items.map((row, i) => (
            <li key={`${row.actorId}:${row.movieId}`}>
              <Link
                href={`/rate/${row.movieSlug ?? row.movieId}/${row.actorSlug ?? row.actorId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3 hover:border-[#FFD700]/40"
              >
                <span className="min-w-0">
                  <span className="mr-2 tabular-nums text-zinc-500">{i + 1}.</span>
                  <span className="font-medium text-zinc-100">
                    {row.actorName} in {row.movieTitle}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{row.movieYear}</span>
                </span>
                <span className="shrink-0 tabular-nums text-sm font-semibold text-[#FFD700]">
                  {row.dimScore.toFixed(1)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </HomeLayout>
  )
}
