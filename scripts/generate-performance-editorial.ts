/**
 * Generate performance editorials for the highest-traffic indexable pages.
 *
 * Usage:
 *   npx tsx scripts/generate-performance-editorial.ts --limit=20
 *   npx tsx scripts/generate-performance-editorial.ts --limit=5 --minRatings=3
 *   npx tsx scripts/generate-performance-editorial.ts --actorId=... --movieId=...
 *
 * Requires: DATABASE_URL
 * Uses deterministic score templates (no OpenAI).
 */
import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { generatePerformanceEditorial, markStaleEditorialsNeedingRegen } from "../src/lib/editorial/generate-performance-editorial"
import { listEditorialGenerationQueue } from "../src/lib/editorial/editorial-queue"

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

async function main() {
  const limit = Number(argValue("--limit") ?? "20")
  const minRatings = Number(argValue("--minRatings") ?? "1")
  const actorId = argValue("--actorId")
  const movieId = argValue("--movieId")
  const skipStale = hasFlag("--skip-stale-scan")

  if (!skipStale) {
    const marked = await markStaleEditorialsNeedingRegen(prisma, 200)
    console.log(`[editorial] marked ${marked} row(s) NEEDS_REGEN`)
  }

  const targets =
    actorId && movieId
      ? [{ actorId, movieId, actorName: "?", movieTitle: "?", movieYear: 0, ratingCount: 0, reason: "missing" as const }]
      : await listEditorialGenerationQueue(prisma, {
          limit: Number.isFinite(limit) ? limit : 20,
          minRatings: Number.isFinite(minRatings) ? minRatings : 1,
        })

  console.log(`[editorial] generating for ${targets.length} performance(s)`)

  let ok = 0
  let fail = 0
  for (const t of targets) {
    const label = `${t.actorName} / ${t.movieTitle} (${t.movieYear}) [${t.reason}] ratings=${t.ratingCount}`
    process.stdout.write(`→ ${label} … `)
    const result = await generatePerformanceEditorial(prisma, t.actorId, t.movieId, {
      publish: true,
    })
    if (result.ok) {
      ok += 1
      console.log(`OK ${result.status} ${result.wordCount}w`)
    } else {
      fail += 1
      console.log(`FAIL ${result.reason}`)
    }
  }

  console.log(`[editorial] done ok=${ok} fail=${fail}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
