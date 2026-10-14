import type { FaceOffPreferences } from "@/lib/faceoff/pair"
import { eraFromYear } from "@/lib/faceoff/pair"

export type ScoreCandidate = {
  id: string
  elo: number
  comparisonCount: number
  popularity: number
  year?: number | null
  genre?: string | null
}

const ELO_WEIGHT = 0.35
const POPULARITY_WEIGHT = 0.25
const PREFERENCE_WEIGHT = 0.2
const DISCOVERY_WEIGHT = 0.2

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function preferenceScore(candidate: ScoreCandidate, preferences?: FaceOffPreferences | null): number {
  if (!preferences) return 0.5
  let parts = 0
  let hits = 0
  const genres = (preferences.genres ?? []).map((g) => g.toLowerCase())
  if (genres.length > 0) {
    parts += 1
    const haystack = (candidate.genre ?? "").toLowerCase()
    if (haystack && genres.some((g) => haystack.includes(g))) hits += 1
  }
  const eras = preferences.eras ?? []
  if (eras.length > 0) {
    parts += 1
    const era = eraFromYear(candidate.year)
    if (era && eras.includes(era)) hits += 1
  }
  if (parts === 0) return 0.5
  return hits / parts
}

/**
 * Hybrid opponent score. Popularity is one input and cannot reach 1 by itself.
 * Discovery rewards entities with fewer comparisons inside the candidate set.
 */
export function scoreOpponent(
  anchor: ScoreCandidate,
  candidate: ScoreCandidate,
  pool: ScoreCandidate[],
  preferences?: FaceOffPreferences | null,
): number {
  const eloCloseness = 1 - clamp01(Math.abs(anchor.elo - candidate.elo) / 400)
  const maxPop = Math.max(1, ...pool.map((c) => c.popularity))
  const popularity = clamp01(candidate.popularity / maxPop)
  const maxSeen = Math.max(1, ...pool.map((c) => c.comparisonCount))
  const discovery = 1 - clamp01(candidate.comparisonCount / maxSeen)
  const preference = preferenceScore(candidate, preferences)

  let familiarity = 1
  if (preferences?.familiarity === "familiar") familiarity = 1.25
  if (preferences?.familiarity === "discovery") familiarity = 0.65

  return (
    ELO_WEIGHT * eloCloseness +
    POPULARITY_WEIGHT * popularity * familiarity +
    PREFERENCE_WEIGHT * preference +
    DISCOVERY_WEIGHT * discovery * (preferences?.familiarity === "discovery" ? 1.4 : 1)
  )
}

/** Weighted pick. A zero-total falls back to a uniform choice. */
export function pickWeighted<T>(items: T[], weightOf: (item: T) => number, random: () => number = Math.random): T | null {
  if (items.length === 0) return null
  const weights = items.map((item) => Math.max(0.0001, weightOf(item)))
  const total = weights.reduce((sum, w) => sum + w, 0)
  let cursor = random() * total
  for (let i = 0; i < items.length; i += 1) {
    cursor -= weights[i]
    if (cursor <= 0) return items[i]
  }
  return items[items.length - 1]
}

export function shouldForceDiscovery(random: () => number = Math.random): boolean {
  return random() < 0.2
}
