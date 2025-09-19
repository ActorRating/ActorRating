import dotenv from 'dotenv'
dotenv.config()
import { PrismaClient } from '@prisma/client'
import { getMovieCredits } from '../src/lib/tmdb'

const prisma = new PrismaClient()

type Args = {
  movie?: string
  year?: number
  dryRun?: boolean
}

function parseArgs(): Args {
  const args: Args = {}
  for (const raw of process.argv.slice(2)) {
    const [k, v] = raw.split('=')
    if (k === '--movie') args.movie = v
    else if (k === '--year') args.year = Number(v)
    else if (k === '--dry') args.dryRun = true
  }
  return args
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function backfill(): Promise<void> {
  if (!process.env.TMDB_API_KEY) {
    console.error('❌ Missing TMDB_API_KEY in .env')
    process.exit(1)
  }
  const { movie: movieFilter, year: yearFilter, dryRun } = parseArgs()

  console.log('Starting TMDB character backfill...')
  if (movieFilter) console.log(`  • Filter: title contains "${movieFilter}"${yearFilter ? `, year=${yearFilter}` : ''}`)
  if (dryRun) console.log('  • DRY RUN (no database updates)')

  // Find movies that have missing/unknown characters in at least one performance and have a tmdbId
  const movies = await prisma.movie.findMany({
    where: {
      tmdbId: { not: null },
      ...(movieFilter
        ? { title: { contains: movieFilter, mode: 'insensitive' }, ...(yearFilter ? { year: yearFilter } : {}) }
        : {}),
      performances: {
        some: {
          OR: [
            { character: null },
            { character: '' },
            { character: 'Unknown' },
          ],
        },
      },
    },
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      performances: {
        where: {
          OR: [
            { character: null },
            { character: '' },
            { character: 'Unknown' },
          ],
        },
        select: { id: true, character: true, actor: { select: { name: true } } },
      },
    },
    orderBy: { year: 'asc' },
  })

  if (movies.length === 0) {
    console.log('No movies found requiring backfill or no TMDB IDs available.')
    return
  }

  let totalUpdated = 0
  let totalTried = 0
  let totalSkipped = 0

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i]
    if (!m.tmdbId) { totalSkipped += m.performances.length; continue }

    console.log(`\n[${i + 1}/${movies.length}] ${m.title} (${m.year}) - TMDB ${m.tmdbId} • ${m.performances.length} targets`)

    // Fetch credits for this movie (TMDB rate-limit friendly: 500ms between calls)
    let credits
    try {
      credits = await getMovieCredits(m.tmdbId)
    } catch (e) {
      console.warn(`  ! Failed to fetch credits for TMDB ${m.tmdbId}:`, (e as Error)?.message)
      totalSkipped += m.performances.length
      await sleep(500)
      continue
    }

    // Build name -> character map (normalized)
    const nameToCharacter = new Map<string, string>()
    for (const c of credits.cast) {
      const key = normalizeName(c.name)
      const val = (c.character || '').trim()
      if (key && val) nameToCharacter.set(key, val)
    }

    let movieUpdated = 0
    for (const perf of m.performances) {
      totalTried += 1
      const actorNameKey = normalizeName(perf.actor?.name || '')
      const charName = nameToCharacter.get(actorNameKey)
      if (!charName) continue

      if (!dryRun) {
        try {
          await prisma.performance.update({
            where: { id: perf.id },
            data: { character: charName },
          })
          movieUpdated += 1
          totalUpdated += 1
        } catch (e) {
          console.warn(`  ! Failed to update Performance ${perf.id}:`, (e as Error)?.message)
        }
      } else {
        movieUpdated += 1
        totalUpdated += 1
      }
    }

    console.log(`  • Updated from TMDB: ${movieUpdated}`)
    // 500ms pause between TMDB calls
    await sleep(500)
  }

  console.log('\nBackfill from TMDB complete.')
  console.log(`  • Movies processed: ${movies.length}`)
  console.log(`  • Performances examined: ${totalTried}`)
  console.log(`  • Performances updated: ${totalUpdated}`)
  console.log(`  • Performances skipped: ${totalSkipped}`)
}

async function main() {
  try {
    await backfill()
  } catch (e) {
    console.error('Backfill failed:', e)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()


