import type { ContextPackage } from "@/lib/arie/types"

export type CoverageSlots = {
  actor: boolean
  movie: boolean
  director: boolean
  radar: boolean
  comparisons: boolean
  awards: boolean
  community: boolean
}

export type ContextCoverage = {
  slots: CoverageSlots
  present: number
  total: number
  percent: number
}

const SLOT_KEYS: Array<keyof CoverageSlots> = [
  "actor",
  "movie",
  "director",
  "radar",
  "comparisons",
  "awards",
  "community",
]

/**
 * Context Coverage Score — explains weak drafts before you blame the prompt.
 */
export function computeContextCoverage(
  pkg: Omit<ContextPackage, "coverage">,
): ContextCoverage {
  const slots: CoverageSlots = {
    actor: Boolean(pkg.actor?.id),
    movie: Boolean(pkg.movie?.id),
    director: Boolean(pkg.director?.name),
    radar: Boolean(
      pkg.radar &&
        Object.values(pkg.radar.dimensions).some((v) => typeof v === "number"),
    ),
    comparisons: pkg.relatedPerformances.length > 0 || pkg.similarActors.length > 0,
    // Awards not in Context Builder yet — counted so gaps stay visible.
    awards: pkg.facts.some((f) => /award|oscar|emmy|bafta|golden globe/i.test(f.text)),
    community: Boolean(pkg.communityRating && pkg.communityRating.ratingCount > 0),
  }

  const present = SLOT_KEYS.filter((k) => slots[k]).length
  const total = SLOT_KEYS.length
  const percent = Math.round((present / total) * 100)

  return { slots, present, total, percent }
}
