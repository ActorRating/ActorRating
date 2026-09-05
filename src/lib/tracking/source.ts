export const VALID_SOURCES = [
  "tiktok",
  "instagram",
  "youtube",
  "x",
  "google",
  "bing",
] as const

export type AcquisitionSource = (typeof VALID_SOURCES)[number]

export const AR_SRC_COOKIE = "ar_src"
/** 30 days — first-touch acquisition attribution. */
export const AR_SRC_MAX_AGE_SEC = 60 * 60 * 24 * 30

/** Aliases people might put in ?src= / utm_source → canonical channel. */
const SOURCE_ALIASES: Record<string, AcquisitionSource> = {
  twitter: "x",
  goog: "google",
  googleorganic: "google",
  "google-organic": "google",
  bingorganic: "bing",
  "bing-organic": "bing",
}

export function isValidSource(
  value: string | null | undefined
): value is AcquisitionSource {
  if (!value) return false
  return VALID_SOURCES.includes(value as AcquisitionSource)
}

/** Lowercase + trim; returns a valid source or null. Maps twitter → x. */
export function normalizeAcquisitionSource(
  value: string | null | undefined
): AcquisitionSource | null {
  if (!value) return null
  const lower = value.trim().toLowerCase()
  if (isValidSource(lower)) return lower
  return SOURCE_ALIASES[lower] ?? null
}

/**
 * Infer acquisition channel from document/HTTP referrer when no tagged
 * utm_source / src param is present (organic Google, Bing, X, etc.).
 */
export function inferAcquisitionSourceFromReferrer(
  referrer: string | null | undefined,
): AcquisitionSource | null {
  const raw = referrer?.trim()
  if (!raw) return null

  let host: string
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }

  if (
    host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com") ||
    host === "t.co"
  ) {
    return "x"
  }
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok"
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return "instagram"
  }
  if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be" ||
    host === "m.youtube.com"
  ) {
    return "youtube"
  }
  if (host === "bing.com" || host.endsWith(".bing.com")) return "bing"

  // google.* search (exclude ad/CDN hosts that are not search)
  if (
    /(?:^|\.)google\.[a-z.]+$/.test(host) &&
    !host.includes("googleusercontent") &&
    !host.includes("googlesyndication") &&
    !host.includes("doubleclick")
  ) {
    return "google"
  }

  return null
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
