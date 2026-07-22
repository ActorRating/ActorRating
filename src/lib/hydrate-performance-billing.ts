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

export function hasUsableCharacter(value: string | null | undefined): boolean {
  const v = (value ?? "").trim()
  if (!v) return false
  const lower = v.toLowerCase()
  return lower !== "unknown" && lower !== "—" && lower !== "-" && lower !== "n/a"
}

type BillingFields = {
  id: string
  order?: number | null
  tier?: PerformanceTier | string | null
  character?: string | null
  actor?: {
    id?: string
    name?: string | null
    tmdbId?: number | null
  } | null
}

type CastHit = {
  order: number
  character: string | null
}

/**
 * Fill missing Performance.order/tier/character from TMDB credits.
 * Matching: actor.tmdbId first, then normalized actor name.
 */
export async function hydratePerformanceBillingOrder<T extends BillingFields>(
  prisma: PrismaClient,
  movie: { id: string; tmdbId: number | null },
  performances: T[],
  options?: { persist?: boolean }
): Promise<T[]> {
  if (!movie.tmdbId || performances.length === 0) return performances

  const needsBilling = performances.some((p) => p.order == null)
  const needsCharacter = performances.some((p) => !hasUsableCharacter(p.character))
  if (!needsBilling && !needsCharacter) return performances

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
  const byTmdbId = new Map<number, CastHit>()
  const byName = new Map<string, CastHit>()

  cast.forEach((member) => {
    const hit: CastHit = {
      order: member.order,
      character: member.character?.trim() || null,
    }
    if (typeof member.id === "number" && !byTmdbId.has(member.id)) {
      byTmdbId.set(member.id, hit)
    }
    const key = normalizeName(member.name)
    if (key && !byName.has(key)) byName.set(key, hit)
  })

  const updates: {
    id: string
    order?: number
    tier?: PerformanceTier
    character?: string | null
  }[] = []

  const hydrated = performances.map((perf) => {
    const tmdbId = perf.actor?.tmdbId
    let hit: CastHit | undefined
    if (typeof tmdbId === "number") hit = byTmdbId.get(tmdbId)
    if (!hit) hit = byName.get(normalizeName(perf.actor?.name))
    if (!hit) return perf

    const next: T = { ...perf }
    const patch: {
      id: string
      order?: number
      tier?: PerformanceTier
      character?: string | null
    } = { id: perf.id }

    if (perf.order == null) {
      next.order = hit.order as T["order"]
      next.tier = computePerformanceTier(hit.order, castSize) as T["tier"]
      patch.order = hit.order
      patch.tier = computePerformanceTier(hit.order, castSize)
    } else if (!perf.tier) {
      next.tier = computePerformanceTier(perf.order, castSize) as T["tier"]
      patch.tier = computePerformanceTier(perf.order, castSize)
    }

    if (!hasUsableCharacter(perf.character) && hasUsableCharacter(hit.character)) {
      next.character = hit.character as T["character"]
      patch.character = hit.character
    }

    const shouldPersist =
      perf.id &&
      !perf.id.startsWith("rating-") &&
      (patch.order !== undefined ||
        patch.tier !== undefined ||
        patch.character !== undefined)

    if (shouldPersist) updates.push(patch)
    return next
  })

  if (options?.persist !== false && updates.length > 0) {
    void Promise.allSettled(
      updates.map((u) =>
        prisma.performance.update({
          where: { id: u.id },
          data: {
            ...(u.order !== undefined && { order: u.order }),
            ...(u.tier !== undefined && { tier: u.tier }),
            ...(u.character !== undefined && { character: u.character }),
          },
        })
      )
    ).catch((err) => {
      console.warn("[hydrate-billing] persist failed:", (err as Error)?.message)
    })
  }

  return hydrated
}

/** Prefer a real TMDB/system character over empty/"Unknown" when deduping rows. */
export function pickBetterCharacter(
  a: string | null | undefined,
  b: string | null | undefined
): string | null {
  if (hasUsableCharacter(a)) return (a ?? "").trim()
  if (hasUsableCharacter(b)) return (b ?? "").trim()
  return (a ?? b ?? null) as string | null
}
