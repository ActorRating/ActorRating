import type { PerformanceTier, PrismaClient } from "@prisma/client"
import { computePerformanceTier } from "@/lib/performance-tier"
import { getMovieCreditsForIngestion } from "@/lib/tmdb"

function normalizeName(name: string | null | undefined): string {
  if (!name) return ""
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

type BillingFields = {
  id: string
  order?: number | null
  tier?: PerformanceTier | string | null
  actor?: {
    id?: string
    name?: string | null
    tmdbId?: number | null
  } | null
}

/**
 * When Performance.order/tier were never backfilled, cast-order sorts collapse to A–Z.
 * Fill billing from TMDB credits (by actor tmdbId, then name) so Lead → Supporting → Minor works.
 */
export async function hydratePerformanceBillingOrder<T extends BillingFields>(
  prisma: PrismaClient,
  movie: { id: string; tmdbId: number | null },
  performances: T[],
  options?: { persist?: boolean }
): Promise<T[]> {
  if (!movie.tmdbId || performances.length === 0) return performances

  const missingOrder = performances.filter((p) => p.order == null).length
  // Already fully billed — nothing to do.
  if (missingOrder === 0) return performances
  // If most rows already have order, only fill gaps still (continue).

  let credits
  try {
    credits = await getMovieCreditsForIngestion(movie.tmdbId)
  } catch (err) {
    console.warn(
      `[hydrate-billing] TMDB credits failed for movie ${movie.id}:`,
      (err as Error)?.message
    )
    return performances
  }

  const cast = credits.cast
  if (cast.length === 0) return performances

  const castSize = cast.length
  const byTmdbId = new Map<number, number>()
  const byName = new Map<string, number>()

  cast.forEach((member) => {
    const billingOrder = member.order
    if (typeof member.id === "number" && !byTmdbId.has(member.id)) {
      byTmdbId.set(member.id, billingOrder)
    }
    const key = normalizeName(member.name)
    if (key && !byName.has(key)) byName.set(key, billingOrder)
  })

  const updates: { id: string; order: number; tier: PerformanceTier }[] = []

  const hydrated = performances.map((perf) => {
    if (perf.order != null && perf.tier) return perf

    const tmdbId = perf.actor?.tmdbId
    let order: number | undefined
    if (typeof tmdbId === "number") order = byTmdbId.get(tmdbId)
    if (order === undefined) order = byName.get(normalizeName(perf.actor?.name))
    if (order === undefined) return perf

    const tier = computePerformanceTier(order, castSize)
    if (perf.id && !perf.id.startsWith("rating-")) {
      updates.push({ id: perf.id, order, tier })
    }
    return { ...perf, order, tier }
  })

  if (options?.persist !== false && updates.length > 0) {
    // Persist in background so the response stays fast after hydration.
    void Promise.allSettled(
      updates.map((u) =>
        prisma.performance.update({
          where: { id: u.id },
          data: { order: u.order, tier: u.tier },
        })
      )
    ).catch((err) => {
      console.warn("[hydrate-billing] persist failed:", (err as Error)?.message)
    })
  }

  return hydrated
}
