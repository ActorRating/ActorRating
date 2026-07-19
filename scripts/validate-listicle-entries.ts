/**
 * Validate proposed listicle entries against the DB (slug, tier, community, indexability).
 * Run on Coolify: node /tmp/validate-listicle-entries.cjs
 * Or locally with reachable DATABASE_URL: npx tsx scripts/validate-listicle-entries.ts
 */
import dotenv from "dotenv"
dotenv.config()

import { PrismaClient } from "@prisma/client"
import { isRatePageIndexable } from "../src/lib/rate-page-seo"

const prisma = new PrismaClient()
const SYSTEM_USER_ID = "uuid-from-auth-users"

type Candidate = {
  topic: string
  actorName: string
  movieTitle: string
  movieYear?: number
  note?: string
}

const CANDIDATES: Candidate[] = [
  // 1 — saved mediocre movies
  { topic: "5-performances-that-saved-mediocre-movies", actorName: "Rachel Weisz", movieTitle: "The Mummy Returns", movieYear: 2001 },
  { topic: "5-performances-that-saved-mediocre-movies", actorName: "Dwayne Johnson", movieTitle: "The Mummy Returns", movieYear: 2001 },
  // 2 — Nolan underrated
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Aaron Eckhart", movieTitle: "The Dark Knight", movieYear: 2008 },
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Michael Caine", movieTitle: "Inception", movieYear: 2010 },
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Cillian Murphy", movieTitle: "The Dark Knight", movieYear: 2008 },
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Michael Caine", movieTitle: "The Dark Knight", movieYear: 2008 },
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Anne Hathaway", movieTitle: "Interstellar", movieYear: 2014 },
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Jessica Chastain", movieTitle: "Interstellar", movieYear: 2014 },
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Matt Damon", movieTitle: "Interstellar", movieYear: 2014 },
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Robert Downey Jr.", movieTitle: "Oppenheimer", movieYear: 2023 },
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Emily Blunt", movieTitle: "Oppenheimer", movieYear: 2023 },
  { topic: "underrated-performances-christopher-nolan-films", actorName: "Matt Damon", movieTitle: "Oppenheimer", movieYear: 2023 },
  // 3 — Joker head-to-head
  { topic: "ledger-vs-phoenix-joker-compared", actorName: "Heath Ledger", movieTitle: "The Dark Knight", movieYear: 2008 },
  { topic: "ledger-vs-phoenix-joker-compared", actorName: "Joaquin Phoenix", movieTitle: "Joker", movieYear: 2019 },
  // 4 — scene stealers
  { topic: "scene-stealers-supporting-performances", actorName: "Samuel L. Jackson", movieTitle: "Pulp Fiction", movieYear: 1994 },
  { topic: "scene-stealers-supporting-performances", actorName: "Brad Pitt", movieTitle: "Fight Club", movieYear: 1999 },
  { topic: "scene-stealers-supporting-performances", actorName: "Edward Norton", movieTitle: "Fight Club", movieYear: 1999 },
  { topic: "scene-stealers-supporting-performances", actorName: "Jonah Hill", movieTitle: "The Wolf of Wall Street", movieYear: 2013 },
  { topic: "scene-stealers-supporting-performances", actorName: "Leonardo DiCaprio", movieTitle: "The Wolf of Wall Street", movieYear: 2013 },
  // 5 — unsettling
  { topic: "most-unsettling-performances", actorName: "Javier Bardem", movieTitle: "No Country for Old Men", movieYear: 2007 },
  { topic: "most-unsettling-performances", actorName: "Daniel Day-Lewis", movieTitle: "There Will Be Blood", movieYear: 2007 },
  { topic: "most-unsettling-performances", actorName: "Christian Bale", movieTitle: "American Psycho", movieYear: 2000 },
  { topic: "most-unsettling-performances", actorName: "Kevin Spacey", movieTitle: "Se7en", movieYear: 1995 },
  // 6 — Tarantino ensembles (film-level — check lead/supporting cast presence)
  { topic: "tarantino-ensembles-ranked", actorName: "John Travolta", movieTitle: "Pulp Fiction", movieYear: 1994 },
  { topic: "tarantino-ensembles-ranked", actorName: "Samuel L. Jackson", movieTitle: "Pulp Fiction", movieYear: 1994 },
  { topic: "tarantino-ensembles-ranked", actorName: "Uma Thurman", movieTitle: "Pulp Fiction", movieYear: 1994 },
  { topic: "tarantino-ensembles-ranked", actorName: "Jamie Foxx", movieTitle: "Django Unchained", movieYear: 2012 },
  { topic: "tarantino-ensembles-ranked", actorName: "Christoph Waltz", movieTitle: "Django Unchained", movieYear: 2012 },
  { topic: "tarantino-ensembles-ranked", actorName: "Leonardo DiCaprio", movieTitle: "Django Unchained", movieYear: 2012 },
  { topic: "tarantino-ensembles-ranked", actorName: "Brad Pitt", movieTitle: "Once Upon a Time in Hollywood", movieYear: 2019 },
  { topic: "tarantino-ensembles-ranked", actorName: "Leonardo DiCaprio", movieTitle: "Once Upon a Time in Hollywood", movieYear: 2019 },
  { topic: "tarantino-ensembles-ranked", actorName: "Margot Robbie", movieTitle: "Once Upon a Time in Hollywood", movieYear: 2019 },
  // 7 — Pacino / De Niro
  { topic: "pacino-de-niro-crime-cinema-rivalry", actorName: "Al Pacino", movieTitle: "The Godfather", movieYear: 1972 },
  { topic: "pacino-de-niro-crime-cinema-rivalry", actorName: "Al Pacino", movieTitle: "The Godfather Part II", movieYear: 1974 },
  { topic: "pacino-de-niro-crime-cinema-rivalry", actorName: "Al Pacino", movieTitle: "Scarface", movieYear: 1983 },
  { topic: "pacino-de-niro-crime-cinema-rivalry", actorName: "Al Pacino", movieTitle: "Heat", movieYear: 1995 },
  { topic: "pacino-de-niro-crime-cinema-rivalry", actorName: "Robert De Niro", movieTitle: "The Godfather Part II", movieYear: 1974 },
  { topic: "pacino-de-niro-crime-cinema-rivalry", actorName: "Robert De Niro", movieTitle: "Heat", movieYear: 1995 },
  // 8 — 2020s supporting
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Robert Downey Jr.", movieTitle: "Oppenheimer", movieYear: 2023 },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Emily Blunt", movieTitle: "Oppenheimer", movieYear: 2023 },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Ryan Gosling", movieTitle: "Barbie", movieYear: 2023 },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "America Ferrera", movieTitle: "Barbie", movieYear: 2023 },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Ke Huy Quan", movieTitle: "Everything Everywhere All at Once", movieYear: 2022 },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Stephanie Hsu", movieTitle: "Everything Everywhere All at Once", movieYear: 2022 },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Jamie Lee Curtis", movieTitle: "Everything Everywhere All at Once", movieYear: 2022 },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Robert De Niro", movieTitle: "Killers of the Flower Moon", movieYear: 2023 },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Lily Gladstone", movieTitle: "Killers of the Flower Moon", movieYear: 2023 },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Song Kang-ho", movieTitle: "Parasite", movieYear: 2019, note: "only if Parasite cast ingested" },
  { topic: "best-supporting-2020s-awards-contenders", actorName: "Choi Woo-shik", movieTitle: "Parasite", movieYear: 2019, note: "only if Parasite cast ingested" },
]

function computeAvg10(
  ratings: Array<{
    emotionalRangeDepth: number | null
    characterBelievability: number | null
    technicalSkill: number | null
    screenPresence: number | null
    chemistryInteraction: number | null
  }>,
): number | null {
  if (ratings.length === 0) return null
  const totals = ratings
    .map((r) => {
      const parts = [
        r.emotionalRangeDepth,
        r.characterBelievability,
        r.technicalSkill,
        r.screenPresence,
        r.chemistryInteraction,
      ].filter((v): v is number => typeof v === "number")
      if (parts.length === 0) return null
      return parts.reduce((s, v) => s + v, 0) / parts.length
    })
    .filter((v): v is number => v != null)
  if (totals.length === 0) return null
  return Number((totals.reduce((s, v) => s + v, 0) / totals.length / 10).toFixed(1))
}

async function findMovie(title: string, year?: number) {
  if (year != null) {
    const exact = await prisma.movie.findFirst({
      where: { title: { equals: title, mode: "insensitive" }, year },
      select: {
        id: true,
        title: true,
        year: true,
        slug: true,
        indexingCohort: true,
        tmdbRating: true,
        isFeaturette: true,
        _count: { select: { performances: true } },
      },
    })
    if (exact) return exact
  }
  return prisma.movie.findFirst({
    where: { title: { equals: title, mode: "insensitive" } },
    select: {
      id: true,
      title: true,
      year: true,
      slug: true,
      indexingCohort: true,
      tmdbRating: true,
      isFeaturette: true,
      _count: { select: { performances: true } },
    },
    orderBy: { year: "desc" },
  })
}

async function findActor(name: string) {
  const exact = await prisma.actor.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true, slug: true },
  })
  if (exact) return exact
  return prisma.actor.findFirst({
    where: { name: { contains: name, mode: "insensitive" } },
    select: { id: true, name: true, slug: true },
  })
}

async function suggestNonMinorFromMovie(movieId: string, limit = 5) {
  const rows = await prisma.$queryRaw<
    Array<{
      actorName: string
      actorSlug: string | null
      tier: string
      ratingCount: bigint
      seeded: number | null
    }>
  >`
    WITH ranked AS (
      SELECT
        a.name AS "actorName",
        a.slug AS "actorSlug",
        p.tier::text AS tier,
        p."seededAggregateScore" AS seeded,
        (SELECT COUNT(*) FROM "Rating" r WHERE r."actorId" = p."actorId" AND r."movieId" = p."movieId") AS "ratingCount",
        ROW_NUMBER() OVER (
          PARTITION BY p."actorId"
          ORDER BY CASE WHEN p."userId" = ${SYSTEM_USER_ID} THEN 0 ELSE 1 END, p."order" ASC NULLS LAST
        ) AS rn
      FROM "Performance" p
      INNER JOIN "Actor" a ON a.id = p."actorId"
      WHERE p."movieId" = ${movieId}
        AND p.tier <> 'MINOR'
    )
    SELECT "actorName", "actorSlug", tier, "ratingCount", seeded
    FROM ranked
    WHERE rn = 1
    ORDER BY "ratingCount" DESC, "actorName" ASC
    LIMIT ${limit}
  `
  return rows.map((r) => ({
    actorName: r.actorName,
    actorSlug: r.actorSlug,
    tier: r.tier,
    ratingCount: Number(r.ratingCount),
    seeded: r.seeded,
  }))
}

type RowStatus = "OK" | "MISSING" | "MINOR" | "NOINDEX" | "UNRATED"

async function validateOne(c: Candidate) {
  const movie = await findMovie(c.movieTitle, c.movieYear)
  const actor = await findActor(c.actorName)

  if (!movie) {
    return {
      topic: c.topic,
      query: `${c.actorName} — ${c.movieTitle}${c.movieYear ? ` (${c.movieYear})` : ""}`,
      status: "MISSING" as RowStatus,
      detail: "movie not found",
      note: c.note,
      substitutes: [] as Awaited<ReturnType<typeof suggestNonMinorFromMovie>>,
    }
  }

  if (!actor) {
    const substitutes = await suggestNonMinorFromMovie(movie.id)
    return {
      topic: c.topic,
      query: `${c.actorName} — ${c.movieTitle}${c.movieYear ? ` (${c.movieYear})` : ""}`,
      status: "MISSING" as RowStatus,
      detail: `actor not found; movie ok slug=${movie.slug} perfs=${movie._count.performances} cohort=${movie.indexingCohort} tmdb=${movie.tmdbRating ?? "n/a"}`,
      note: c.note,
      movieSlug: movie.slug,
      substitutes,
    }
  }

  const [systemPerf, anyPerf, ratings] = await Promise.all([
    prisma.performance.findFirst({
      where: { actorId: actor.id, movieId: movie.id, userId: SYSTEM_USER_ID },
      select: { tier: true, seededAggregateScore: true, order: true, character: true },
    }),
    prisma.performance.findFirst({
      where: { actorId: actor.id, movieId: movie.id },
      select: { tier: true, seededAggregateScore: true, order: true, character: true },
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
  if (!perf) {
    const substitutes = await suggestNonMinorFromMovie(movie.id)
    return {
      topic: c.topic,
      query: `${c.actorName} — ${c.movieTitle}${c.movieYear ? ` (${c.movieYear})` : ""}`,
      status: "MISSING" as RowStatus,
      detail: `no Performance row (actor=${actor.slug}, movie=${movie.slug}, moviePerfs=${movie._count.performances})`,
      note: c.note,
      actorSlug: actor.slug,
      movieSlug: movie.slug,
      substitutes,
    }
  }

  const communityAvg10 = computeAvg10(ratings)
  const communityRatingCount = ratings.length
  const seeded =
    typeof perf.seededAggregateScore === "number" ? perf.seededAggregateScore : null
  const indexable = isRatePageIndexable({
    movieSlug: movie.slug,
    movieTitle: movie.title,
    indexingCohort: movie.indexingCohort,
    seededAggregateScore: seeded,
    communityRatingCount,
    tier: perf.tier,
  })

  let status: RowStatus = "OK"
  if (perf.tier === "MINOR") status = "MINOR"
  else if (!indexable) status = "NOINDEX"
  else if (communityRatingCount === 0) status = "UNRATED"

  const substitutes =
    status === "MINOR" || status === "NOINDEX" || status === "MISSING"
      ? await suggestNonMinorFromMovie(movie.id)
      : []

  return {
    topic: c.topic,
    query: `${actor.name} — ${movie.title} (${movie.year})`,
    status,
    detail: `slug=/rate/${movie.slug}/${actor.slug} tier=${perf.tier} order=${perf.order ?? "n/a"} character=${perf.character ?? "—"} community=${communityAvg10 ?? "n/a"} (${communityRatingCount}) seeded=${seeded ?? "n/a"} cohort=${movie.indexingCohort} indexable=${indexable} filmTmdb=${movie.tmdbRating ?? "n/a"}`,
    note: c.note,
    actorSlug: actor.slug,
    movieSlug: movie.slug,
    tier: perf.tier,
    communityAvg10,
    communityRatingCount,
    seeded,
    indexable,
    filmTmdb: movie.tmdbRating,
    substitutes,
  }
}

async function main() {
  const results = []
  for (const c of CANDIDATES) {
    results.push(await validateOne(c))
  }

  const byTopic = new Map<string, typeof results>()
  for (const r of results) {
    if (!byTopic.has(r.topic)) byTopic.set(r.topic, [])
    byTopic.get(r.topic)!.push(r)
  }

  console.log("========== LISTICLE ENTRY VALIDATION ==========\n")
  for (const [topic, rows] of byTopic) {
    console.log(`## ${topic}`)
    for (const r of rows) {
      console.log(`  [${r.status}] ${r.query}`)
      console.log(`         ${r.detail}`)
      if (r.note) console.log(`         note: ${r.note}`)
      if (r.substitutes && r.substitutes.length > 0) {
        console.log("         substitutes (non-MINOR on same film):")
        for (const s of r.substitutes) {
          console.log(
            `           - ${s.actorName} (${s.actorSlug}) tier=${s.tier} ratings=${s.ratingCount} seeded=${s.seeded ?? "n/a"}`,
          )
        }
      }
    }
    console.log("")
  }

  const counts = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  console.log("SUMMARY", counts)
  console.log("================================================")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
