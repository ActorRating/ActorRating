import type { FaceOffComparisonType, FaceOffModeName } from "@/lib/faceoff/constants"

/** Unordered identity of a matchup. Reversing the sides does not change the key. */
export function canonicalPairKey(leftId: string, rightId: string): string {
  return leftId < rightId ? `${leftId}:${rightId}` : `${rightId}:${leftId}`
}

export function resolveComparisonType(
  mode: FaceOffModeName,
  lastComparisonType: FaceOffComparisonType | null,
): FaceOffComparisonType {
  if (mode === "actor") return "actor"
  if (mode === "performance") return "performance"
  return lastComparisonType === "actor" ? "performance" : "actor"
}

export type EraPreference = "classic" | "modern" | "recent"
export type FamiliarityPreference = "familiar" | "balanced" | "discovery"

export type FaceOffPreferences = {
  genres?: string[]
  eras?: EraPreference[]
  familiarity?: FamiliarityPreference
}

export function eraFromYear(year: number | null | undefined): EraPreference | null {
  if (year == null || !Number.isFinite(year)) return null
  if (year < 1980) return "classic"
  if (year < 2010) return "modern"
  return "recent"
}

export function parseMode(value: string | null | undefined): FaceOffModeName | null {
  if (value === "actor" || value === "performance" || value === "mixed") return value
  return null
}
