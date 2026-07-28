import "server-only"
import { prisma } from "@/lib/prisma"

/**
 * Prisma Actor/Movie ids are cuids (not UUIDs). Callers often pass id OR slug.
 * Always try id first, then slug — never assume "non-UUID === slug".
 */
export async function resolveActorId(idOrSlug: string): Promise<string | null> {
  const raw = idOrSlug.trim()
  if (!raw) return null
  const byId = await prisma.actor.findUnique({
    where: { id: raw },
    select: { id: true },
  })
  if (byId) return byId.id
  const bySlug = await prisma.actor.findUnique({
    where: { slug: raw },
    select: { id: true },
  })
  return bySlug?.id ?? null
}

export async function resolveMovieId(idOrSlug: string): Promise<string | null> {
  const raw = idOrSlug.trim()
  if (!raw) return null
  const byId = await prisma.movie.findUnique({
    where: { id: raw },
    select: { id: true },
  })
  if (byId) return byId.id
  const bySlug = await prisma.movie.findUnique({
    where: { slug: raw },
    select: { id: true },
  })
  return bySlug?.id ?? null
}
