export const VALID_SOURCES = ["tiktok", "instagram", "youtube"] as const

export type AcquisitionSource = (typeof VALID_SOURCES)[number]

export const AR_SRC_COOKIE = "ar_src"
/** 30 days — first-touch acquisition attribution. */
export const AR_SRC_MAX_AGE_SEC = 60 * 60 * 24 * 30

export function isValidSource(
  value: string | null | undefined
): value is AcquisitionSource {
  if (!value) return false
  return VALID_SOURCES.includes(value as AcquisitionSource)
}

/** Lowercase + trim; returns a valid source or null. */
export function normalizeAcquisitionSource(
  value: string | null | undefined
): AcquisitionSource | null {
  if (!value) return null
  const lower = value.trim().toLowerCase()
  return isValidSource(lower) ? lower : null
}

export function arSrcCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: AR_SRC_MAX_AGE_SEC,
  }
}
