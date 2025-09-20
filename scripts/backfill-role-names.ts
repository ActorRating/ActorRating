import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type CandidatePerf = {
  id: string
  userId: string
  actorId: string
  movieId: string
}

const BATCH_SIZE = 100

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `
  return !!rows?.[0]?.exists
}

async function fetchCandidates(tx: any): Promise<CandidatePerf[]> {
  // Find performances where character is NULL/empty/'Unknown'
  const rows = await tx.$queryRaw<CandidatePerf[]>`
    SELECT "id", "userId", "actorId", "movieId"
    FROM "Performance"
    WHERE "character" IS NULL
       OR btrim("character") = ''
       OR lower(btrim("character")) = 'unknown'
    ORDER BY "id" ASC
  `
  return rows
}

async function findBestRoleNameFor(tx: any, perf: CandidatePerf): Promise<string | null> {
  // Aggregate most frequent across all users for same (actorId, movieId)
  const agg = await tx.$queryRaw<{ roleName: string; cnt: number }[]>`
    SELECT "roleName", COUNT(*)::int AS cnt
    FROM "Rating"
    WHERE "actorId" = ${perf.actorId}
      AND "movieId" = ${perf.movieId}
      AND "roleName" IS NOT NULL
      AND btrim("roleName") <> ''
    GROUP BY "roleName"
    ORDER BY cnt DESC
    LIMIT 1
  `
  const aggName = (agg?.[0]?.roleName || '').trim()
  if (aggName) return aggName

  return null
}

async function backfill(): Promise<void> {
  let updatedFromRatings = 0
  let setUnknown = 0

  // Guard: ensure Performance.character exists
  const hasCharacter = await columnExists('Performance', 'character')
  if (!hasCharacter) {
    console.log('No "character" column on Performance. Nothing to backfill.')
    return
  }

  await prisma.$transaction(async (tx) => {
    const candidates = await fetchCandidates(tx)
    if (!candidates.length) {
      return
    }

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE)

      for (const perf of batch) {
        const best = await findBestRoleNameFor(tx, perf)
        const value = best ?? 'Unknown'
        await tx.$executeRawUnsafe(
          `UPDATE "Performance" SET "character" = $1 WHERE "id" = $2`,
          value,
          perf.id
        )
        if (best) updatedFromRatings += 1
        else setUnknown += 1
      }
    }
  })

  console.log('Backfill complete.')
  console.log(`  • Performances updated with role from ratings: ${updatedFromRatings}`)
  console.log(`  • Performances set to "Unknown": ${setUnknown}`)
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


