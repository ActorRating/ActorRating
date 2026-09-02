import "server-only"
import { prisma } from "@/lib/prisma"

/**
 * Reassign anonymous ratings to a signed-in user. Idempotent — safe when nothing
 * matches or when user already owns the performance rating.
 */
export async function migrateAnonRatingsToUser(
  anonId: string,
  userId: string,
): Promise<{ migrated: number; merged: number }> {
  if (!anonId || !userId) return { migrated: 0, merged: 0 }

  const anonRows = await prisma.rating.findMany({
    where: { anonId, userId: null },
    select: {
      id: true,
      actorId: true,
      movieId: true,
      emotionalRangeDepth: true,
      characterBelievability: true,
      technicalSkill: true,
      screenPresence: true,
      chemistryInteraction: true,
      weightedScore: true,
      shareScore: true,
      comment: true,
      isSpoiler: true,
      breakdown: true,
      createdAt: true,
    },
  })

  if (anonRows.length === 0) return { migrated: 0, merged: 0 }

  let migrated = 0
  let merged = 0

  for (const row of anonRows) {
    const existingUserRating = await prisma.rating.findFirst({
      where: { userId, actorId: row.actorId, movieId: row.movieId },
      select: { id: true },
    })

    if (existingUserRating) {
      // User already rated this performance — drop duplicate anon row.
      await prisma.rating.delete({ where: { id: row.id } })
      merged += 1
      continue
    }

    await prisma.rating.update({
      where: { id: row.id },
      data: { userId, anonId: null },
    })
    migrated += 1
  }

  return { migrated, merged }
}
