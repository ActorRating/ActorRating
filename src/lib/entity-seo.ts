import type { PrismaClient } from "@prisma/client"

/**
 * Align actor/movie robots with sitemap thresholds:
 * indexable when ≥1 community rating OR ≥5 performances on non-featurette titles.
 */
export async function isActorCatalogIndexable(
  prisma: PrismaClient,
  actorId: string,
): Promise<boolean> {
  const hasRating = await prisma.rating.findFirst({
    where: { actorId, movie: { isFeaturette: false } },
    select: { id: true },
  })
  if (hasRating) return true

  const perfCount = await prisma.performance.count({
    where: { actorId, movie: { isFeaturette: false } },
  })
  return perfCount >= 5
}

export async function isMovieCatalogIndexable(
  prisma: PrismaClient,
  movieId: string,
): Promise<boolean> {
  const hasRating = await prisma.rating.findFirst({
    where: { movieId },
    select: { id: true },
  })
  if (hasRating) return true

  const perfCount = await prisma.performance.count({
    where: { movieId },
  })
  return perfCount >= 5
}
