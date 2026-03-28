/**
 * One-shot backfill: populate Movie.posterUrl for all rated movies that have a tmdbId.
 * Run: node scripts/backfill-posters.mjs
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env manually
try {
  const env = readFileSync(resolve(__dirname, '../.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch {}

const TMDB_KEY = process.env.TMDB_API_KEY
const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w342'
const DELAY_MS = 260 // ~40 req / 10 s with buffer

const prisma = new PrismaClient()

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPoster(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return null
  const data = await res.json()
  const path = data.poster_path
  if (!path) return null
  return path.startsWith('/') ? `${TMDB_POSTER_BASE}${path}` : `${TMDB_POSTER_BASE}/${path}`
}

const movies = await prisma.movie.findMany({
  where: {
    isFeaturette: false,
    tmdbId: { not: null },
    posterUrl: null,
    ratings: { some: {} },
  },
  select: { id: true, title: true, tmdbId: true },
})

console.log(`Backfilling posters for ${movies.length} rated movies…`)
let ok = 0, skip = 0, err = 0

for (const movie of movies) {
  await sleep(DELAY_MS)
  try {
    const posterUrl = await fetchPoster(movie.tmdbId)
    if (posterUrl) {
      await prisma.movie.update({ where: { id: movie.id }, data: { posterUrl } })
      console.log(`  ✓ ${movie.title}`)
      ok++
    } else {
      console.log(`  – no poster: ${movie.title}`)
      skip++
    }
  } catch (e) {
    console.error(`  ✗ ${movie.title}: ${e.message}`)
    err++
  }
}

console.log(`\nDone: ${ok} updated, ${skip} no poster, ${err} errors`)
await prisma.$disconnect()
