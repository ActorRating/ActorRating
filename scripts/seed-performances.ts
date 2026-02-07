import { prisma } from "../src/lib/prisma"
import { getMovieCreditsForIngestion, searchMovie } from "../src/lib/tmdb"
import { syncMovieCast } from "../src/lib/movie-ingestion"

type SeedStats = {
  moviesProcessed: number
  moviesSkippedNoTmdb: number
  actorsCreated: number
  performancesUpserted: number
  moviesSkippedTmdb404: number
  tmdbIdSet: number
}

async function getSeedUserId(): Promise<string> {
  const seedEmail = process.env.SEED_USER_EMAIL || "seed_user@example.com"
  const existing = await prisma.user.findUnique({ where: { email: seedEmail } })
  if (existing) return existing.id

  const created = await prisma.user.create({
    data: {
      email: seedEmail,
      password: "",
    },
  })
  return created.id
}

async function main() {
  const limitArgIdx = process.argv.findIndex((a) => a === "--limit")
  const limit = limitArgIdx !== -1 ? Number(process.argv[limitArgIdx + 1]) || undefined : undefined

  const seedUserId = await getSeedUserId()
  const stats: SeedStats = {
    moviesProcessed: 0,
    moviesSkippedNoTmdb: 0,
    actorsCreated: 0,
    performancesUpserted: 0,
    moviesSkippedTmdb404: 0,
    tmdbIdSet: 0,
  }

  const movies = await prisma.movie.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
  })

  for (const movie of movies) {
    stats.moviesProcessed += 1

    // Ensure we have a TMDB id and correct year from TMDB
    let tmdbId = movie.tmdbId
    let tmdbYear: number | undefined
    let tmdbOverview: string | undefined
    if (!tmdbId) {
      try {
        const found = await searchMovie(movie.title)
        if (found) {
          tmdbId = found.id
          tmdbYear = Number(new Date(found.release_date).getFullYear()) || movie.year
          tmdbOverview = found.overview

          // Skip creating duplicates: prefer updating this movie by id; if tmdbId belongs to another row, switch to that row
          const existingByTmdb = await prisma.movie.findUnique({ where: { tmdbId } })
          if (existingByTmdb && existingByTmdb.id !== movie.id) {
            // Use the existing TMDB-linked row instead of creating/updating this one
            Object.assign(movie, existingByTmdb)
          } else {
            // Also check if a (title,year) row exists that's not this one
            const sameTitleYear = await prisma.movie.findFirst({
              where: { title: movie.title, year: tmdbYear },
            })
            if (sameTitleYear && sameTitleYear.id !== movie.id) {
              Object.assign(movie, sameTitleYear)
            } else {
              try {
                const updated = await prisma.movie.update({
                  where: { id: movie.id },
                  data: { tmdbId, year: tmdbYear },
                })
                Object.assign(movie, updated)
                stats.tmdbIdSet += 1
              } catch {
                // If update fails, as a safe fallback, use existingByTmdb if present
                const fallback = await prisma.movie.findUnique({ where: { tmdbId } })
                if (fallback) Object.assign(movie, fallback)
              }
            }
          }
        }
      } catch (err) {
        // fallthrough
      }
    }

    if (!tmdbId) {
      stats.moviesSkippedNoTmdb += 1
      continue
    }

    // Rate-limited full cast fetch (no parallelization)
    let credits
    try {
      credits = await getMovieCreditsForIngestion(tmdbId)
    } catch (err: unknown) {
      const code = (err as { response?: { status?: number } })?.response?.status
      if (code === 404) stats.moviesSkippedTmdb404 += 1
      continue
    }

    try {
      await prisma.movie.update({
        where: { id: movie.id },
        data: {
          director: credits.director,
          ...(tmdbOverview ? { overview: tmdbOverview } : {}),
        },
      })
    } catch {
      // ignore
    }

    // Idempotent sync: full cast, actors by tmdbId, performances upserted (order + tier)
    const result = await syncMovieCast(prisma, movie.id, seedUserId, credits, {
      director: credits.director,
    })
    stats.actorsCreated += result.actorsCreated
    stats.performancesUpserted += result.performancesUpserted
  }

  // eslint-disable-next-line no-console
  console.log("Seeding complete:")
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(stats, null, 2))
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


