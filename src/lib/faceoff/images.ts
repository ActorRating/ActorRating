export type FaceOffImageType = "actor" | "performance"

export type FaceOffImageInput = {
  type: FaceOffImageType
  /** Actor.imageUrl, or the performance's linked actor portrait. */
  portraitUrl?: string | null
  /** Movie.posterUrl. Never a primary image for an actor matchup. */
  posterUrl?: string | null
  /** Cached FaceOffEntity.imageUrl. May be a poster from older syncs. */
  cachedUrl?: string | null
}

export function upgradeFaceOffImage(
  url: string | null | undefined,
  kind: "actor" | "poster",
): string | null {
  if (!url) return null
  if (kind === "actor") {
    return url
      .replace("/t/p/w185/", "/t/p/h632/")
      .replace("/t/p/w92/", "/t/p/h632/")
      .replace("/t/p/w45/", "/t/p/h632/")
  }
  return url.replace(/\/t\/p\/w\d+\//, "/t/p/w342/").replace("/t/p/original/", "/t/p/w342/")
}

/**
 * Actor matchups use a portrait only.
 * Performance matchups prefer the linked actor's portrait, then a film poster.
 */
export function resolveFaceOffImage(input: FaceOffImageInput): string | null {
  const portrait = upgradeFaceOffImage(input.portraitUrl, "actor")
  if (input.type === "actor") return portrait
  const poster = upgradeFaceOffImage(input.posterUrl, "poster")
  return portrait ?? poster ?? upgradeFaceOffImage(input.cachedUrl, "poster")
}
