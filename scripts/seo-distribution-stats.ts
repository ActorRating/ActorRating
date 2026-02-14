/**
 * Distribution stats for SEO indexing thresholds.
 * Uses Performance table (actorId, movieId); counts are per-movie and per-actor.
 *
 * Run: npx tsx scripts/seo-distribution-stats.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('=== 1) MOVIES BY PERFORMANCE COUNT ===\n')

  const totalMovies = await prisma.movie.count()

  // Count movies that have at least k performances (from Performance table)
  const movieThresholds = await prisma.$queryRaw<
    Array<{ ge1: bigint; ge2: bigint; ge3: bigint; ge5: bigint; ge10: bigint }>
  >`
    WITH per_movie AS (
      SELECT "movieId", COUNT(*)::int AS cnt
      FROM "Performance"
      GROUP BY "movieId"
    )
    SELECT
      COUNT(*) FILTER (WHERE cnt >= 1)::bigint AS "ge1",
      COUNT(*) FILTER (WHERE cnt >= 2)::bigint AS "ge2",
      COUNT(*) FILTER (WHERE cnt >= 3)::bigint AS "ge3",
      COUNT(*) FILTER (WHERE cnt >= 5)::bigint AS "ge5",
      COUNT(*) FILTER (WHERE cnt >= 10)::bigint AS "ge10"
    FROM per_movie
  `
  const m = movieThresholds[0]

  console.log('  Total movies (in DB):        ', totalMovies)
  console.log('  Movies with ≥1 performance:  ', Number(m?.ge1 ?? 0))
  console.log('  Movies with ≥2 performances: ', Number(m?.ge2 ?? 0))
  console.log('  Movies with ≥3 performances: ', Number(m?.ge3 ?? 0))
  console.log('  Movies with ≥5 performances: ', Number(m?.ge5 ?? 0))
  console.log('  Movies with ≥10 performances:', Number(m?.ge10 ?? 0))

  console.log('\n=== 2) ACTORS BY PERFORMANCE COUNT ===\n')

  const totalActors = await prisma.actor.count()

  const actorThresholds = await prisma.$queryRaw<
    Array<{ ge1: bigint; ge2: bigint; ge3: bigint; ge5: bigint; ge10: bigint }>
  >`
    WITH per_actor AS (
      SELECT "actorId", COUNT(*)::int AS cnt
      FROM "Performance"
      GROUP BY "actorId"
    )
    SELECT
      COUNT(*) FILTER (WHERE cnt >= 1)::bigint AS "ge1",
      COUNT(*) FILTER (WHERE cnt >= 2)::bigint AS "ge2",
      COUNT(*) FILTER (WHERE cnt >= 3)::bigint AS "ge3",
      COUNT(*) FILTER (WHERE cnt >= 5)::bigint AS "ge5",
      COUNT(*) FILTER (WHERE cnt >= 10)::bigint AS "ge10"
    FROM per_actor
  `
  const a = actorThresholds[0]

  console.log('  Total actors (in DB):        ', totalActors)
  console.log('  Actors with ≥1 performance:  ', Number(a?.ge1 ?? 0))
  console.log('  Actors with ≥2 performances: ', Number(a?.ge2 ?? 0))
  console.log('  Actors with ≥3 performances: ', Number(a?.ge3 ?? 0))
  console.log('  Actors with ≥5 performances: ', Number(a?.ge5 ?? 0))
  console.log('  Actors with ≥10 performances:', Number(a?.ge10 ?? 0))

  console.log('\n=== 3) PERFORMANCE PAGE DENSITY (HISTOGRAMS) ===\n')

  // Histogram: performances per movie
  const movieHistogram = await prisma.$queryRaw<Array<{ cnt: number; num_movies: bigint }>>`
    WITH per_movie AS (
      SELECT "movieId", COUNT(*)::int AS cnt
      FROM "Performance"
      GROUP BY "movieId"
    )
    SELECT cnt, COUNT(*)::bigint AS num_movies
    FROM per_movie
    GROUP BY cnt
    ORDER BY cnt
  `

  console.log('  Performances per movie (count -> number of movies):')
  const bucketsMovie = [
    { label: '  1', from: 1, to: 1 },
    { label: '  2', from: 2, to: 2 },
    { label: '  3', from: 3, to: 3 },
    { label: '  4', from: 4, to: 4 },
    { label: '  5', from: 5, to: 5 },
    { label: '  6-9', from: 6, to: 9 },
    { label: '  10-19', from: 10, to: 19 },
    { label: '  20-49', from: 20, to: 49 },
    { label: '  50-99', from: 50, to: 99 },
    { label: '  100+', from: 100, to: 999999 },
  ]
  for (const b of bucketsMovie) {
    const sum = movieHistogram
      .filter((r) => r.cnt >= b.from && r.cnt <= b.to)
      .reduce((acc, r) => acc + Number(r.num_movies), 0)
    if (sum > 0) console.log(`    ${b.label} performances: ${sum} movies`)
  }
  const totalMoviesWithPerf = movieHistogram.reduce((acc, r) => acc + Number(r.num_movies), 0)
  console.log(`    (total movies with ≥1 performance: ${totalMoviesWithPerf})`)

  // Histogram: performances per actor
  const actorHistogram = await prisma.$queryRaw<Array<{ cnt: number; num_actors: bigint }>>`
    WITH per_actor AS (
      SELECT "actorId", COUNT(*)::int AS cnt
      FROM "Performance"
      GROUP BY "actorId"
    )
    SELECT cnt, COUNT(*)::bigint AS num_actors
    FROM per_actor
    GROUP BY cnt
    ORDER BY cnt
  `

  console.log('\n  Performances per actor (count -> number of actors):')
  const bucketsActor = [
    { label: '  1', from: 1, to: 1 },
    { label: '  2', from: 2, to: 2 },
    { label: '  3', from: 3, to: 3 },
    { label: '  4', from: 4, to: 4 },
    { label: '  5', from: 5, to: 5 },
    { label: '  6-9', from: 6, to: 9 },
    { label: '  10-19', from: 10, to: 19 },
    { label: '  20-49', from: 20, to: 49 },
    { label: '  50-99', from: 50, to: 99 },
    { label: '  100+', from: 100, to: 999999 },
  ]
  for (const b of bucketsActor) {
    const sum = actorHistogram
      .filter((r) => r.cnt >= b.from && r.cnt <= b.to)
      .reduce((acc, r) => acc + Number(r.num_actors), 0)
    if (sum > 0) console.log(`    ${b.label} performances: ${sum} actors`)
  }
  const totalActorsWithPerf = actorHistogram.reduce((acc, r) => acc + Number(r.num_actors), 0)
  console.log(`    (total actors with ≥1 performance: ${totalActorsWithPerf})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
