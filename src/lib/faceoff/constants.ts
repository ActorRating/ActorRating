export const FACEOFF_COOKIE = "ar_faceoff"
/** 30 days */
export const FACEOFF_COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60
export const FACEOFF_SESSION_TTL_MS = FACEOFF_COOKIE_MAX_AGE_SEC * 1000
export const FACEOFF_MATCHUP_TTL_MS = 20 * 60 * 1000
export const FACEOFF_STARTING_ELO = 1500
export const FACEOFF_K_FACTOR = 32
/** Rankings with fewer comparisons are not presented as settled. */
export const FACEOFF_MIN_COMPARISONS = 8
export const FACEOFF_REVEAL_EVERY = 5
export const FACEOFF_MAX_CHOICES = 800

export const FACEOFF_MODES = ["actor", "performance", "mixed"] as const
export type FaceOffModeName = (typeof FACEOFF_MODES)[number]
export type FaceOffComparisonType = "actor" | "performance"

export function isFaceOffEnabled(): boolean {
  const raw = (
    process.env.FACEOFF_ENABLED ??
    process.env.NEXT_PUBLIC_FACEOFF_ENABLED ??
    "true"
  )
    .trim()
    .toLowerCase()
  return raw !== "0" && raw !== "false" && raw !== "off"
}

/** Client nav and CTAs. Defaults on so a missing public env still shows the feature. */
export function isFaceOffUiEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_FACEOFF_ENABLED
  if (raw == null || raw === "") return true
  const normalized = raw.trim().toLowerCase()
  return normalized !== "0" && normalized !== "false" && normalized !== "off"
}
