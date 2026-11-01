/**
 * Shared social / share-card constants.
 *
 * Next.js replaces (does not deep-merge) nested metadata objects, so any page
 * that defines its own `twitter` block must repeat `creator` — otherwise the
 * tag disappears for that page. Import these instead of hard-coding.
 */

export const SITE_URL = "https://actorrating.com"

export const TWITTER_CREATOR = "@ActorRating"

/** Default share image: real 1200×630 (the old /logo.png is 2000×2000, 1.2 MB). */
export const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/og-default.png`

export const DEFAULT_OG_IMAGE = {
  url: DEFAULT_OG_IMAGE_URL,
  width: 1200,
  height: 630,
  alt: "ActorRating — Rate Acting Performances",
} as const
