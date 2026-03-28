/**
 * Concurrent backfill: populate Movie.posterUrl for ALL movies with a tmdbId.
 * Processes 8 movies concurrently, ~40 req/10s = TMDB safe zone.
 * Run: node scripts/backfill-all-posters.mjs
 * Resume-safe: skips movies that already have posterUrl.
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env
try {
  const env = readFileSync(resolve(__dirname, '../.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch {}

const TMDB_KEY = process.env.TMDB_API_KEY
const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w342'
const CONCURRENCY = 8   // 8 parallel req → ~80 req / 10s (TMDB allows 40/10s, be conservative)
const BATCH_DELAY = 300 // ms between batches

if (!TMDB_KEY) { console.error('TMDB_API_KEY not set'); process.exit(1) }

const prisma = new PrismaClient()

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchPoster(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json()
    const path = data.poster_path
    if (!path) return null
    return path.startsWith('/') ? `${TMDB_POSTER_BASE}${path}` : `${TMDB_POSTER_BASE}/${path}`
  } catch {
    return null
  }
}

async function processBatch(batch) {
  return Promise.all(batch.map(async (movie) => {
    const posterUrl = await fetchPoster(movie.tmdbId)
    if (posterUrl) {
      await prisma.movie.update({ where: { id: movie.id }, data: { posterUrl } })
      return 'ok'
    }
    return 'skip'
  }))
}

// Fetch all movies missing posterUrl that have a tmdbId
const movies = await prisma.movie.findMany({
  where: { tmdbId: { not: null }, posterUrl: null },
  select: { id: true, title: true, tmdbId: true },
  orderBy: { createdAt: 'asc' },
})

const total = movies.length
console.log(`Backfilling posters for ${total} movies (8 concurrent)…`)
console.log('This will take approximately', Math.ceil(total / CONCURRENCY * BATCH_DELAY / 1000 / 60), 'minutes.\n')

let ok = 0, skip = 0, batchNum = 0

for (let i = 0; i < movies.length; i += CONCURRENCY) {
  const batch = movies.slice(i, i + CONCURRENCY)
  batchNum++

  const results = await processBatch(batch)
  ok += results.filter(r => r === 'ok').length
  skip += results.filter(r => r === 'skip').length

  const done = Math.min(i + CONCURRENCY, total)
  const pct = ((done / total) * 100).toFixed(1)
  process.stdout.write(`\r  Batch ${batchNum}: ${done}/${total} (${pct}%) — ✓ ${ok} posters, – ${skip} no poster  `)

  if (i + CONCURRENCY < movies.length) await sleep(BATCH_DELAY)
}

console.log(`\n\nDone: ${ok} updated, ${skip} no poster found`)
await prisma.$disconnect()
