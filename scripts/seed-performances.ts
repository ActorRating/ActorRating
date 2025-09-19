import { prisma } from "../src/lib/prisma"
import { getMovieCredits, searchMovie } from "../src/lib/tmdb"

type SeedStats = {
  moviesProcessed: number
  moviesSkippedNoTmdb: number
  actorsCreated: number
  performancesCreated: number
  performancesExisting: number
  performancesSkippedDuplicates: number
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
      // Password is required by schema; empty string is used for OAuth users elsewhere
      password: "",
    },
  })
  return created.id
}

async function ensureActorByName(name: string) {
  const existing = await prisma.actor.findUnique({ where: { name } })
  if (existing) return existing
  return prisma.actor.create({ data: { name } })
}

async function main() {
  const limitArgIdx = process.argv.findIndex((a) => a === "--limit")
  const limit = limitArgIdx !== -1 ? Number(process.argv[limitArgIdx + 1]) || undefined : undefined

  const seedUserId = await getSeedUserId()
  const stats: SeedStats = {
    moviesProcessed: 0,
    moviesSkippedNoTmdb: 0,
    actorsCreated: 0,
    performancesCreated: 0,
    performancesExisting: 0,
    performancesSkippedDuplicates: 0,
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

    let credits
    try {
      credits = await getMovieCredits(tmdbId)
    } catch (err: any) {
      // Skip this movie if credits fetch fails (e.g., 404, rate limits)
      const code = err?.response?.status
      if (code === 404) stats.moviesSkippedTmdb404 += 1
      continue
    }

    // Update director/overview if we know them now
    try {
      await prisma.movie.update({
        where: { id: movie.id },
        data: {
          director: credits.director,
          ...(tmdbOverview ? { overview: tmdbOverview } : {}),
        },
      })
    } catch {
      // ignore update issues here
    }

    for (const cast of credits.cast) {
      // Ensure actor exists
      let actor = await prisma.actor.findUnique({ where: { name: cast.name } })
      if (!actor && cast.id) {
        try {
          const byTmdb = await prisma.actor.findUnique({ where: { tmdbId: cast.id } })
          if (byTmdb) actor = byTmdb
        } catch {}
      }
      if (!actor) {
        try {
          actor = await prisma.actor.create({ data: { name: cast.name, tmdbId: cast.id } })
          stats.actorsCreated += 1
        } catch (e: any) {
          // Unique conflict by name or tmdbId: re-query using tmdbId if present else by name
          if (cast.id) {
            const existing = await prisma.actor.findUnique({ where: { tmdbId: cast.id } }).catch(() => null)
            if (existing) actor = existing
          }
          if (!actor) {
            const existingByName = await prisma.actor.findUnique({ where: { name: cast.name } }).catch(() => null)
            if (existingByName) actor = existingByName
          }
          if (!actor) continue
        }
      }

      // Ensure seeded performance exists (seed user + actor + movie)
      const existingPerf = await prisma.performance.findUnique({
        where: {
          userId_actorId_movieId: {
            userId: seedUserId,
            actorId: actor.id,
            movieId: movie.id,
          },
        },
      })

      if (existingPerf) {
        stats.performancesExisting += 1
        continue
      }

      try {
        await prisma.performance.create({
          data: {
            userId: seedUserId,
            actorId: actor.id,
            movieId: movie.id,
            emotionalRangeDepth: 0,
            characterBelievability: 0,
            technicalSkill: 0,
            screenPresence: 0,
            chemistryInteraction: 0,
            comment: null,
          },
        })
        stats.performancesCreated += 1
      } catch (e: any) {
        // Unique constraint or other errors: count duplicate and continue
        stats.performancesSkippedDuplicates += 1
        continue
      }
    }
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


