/**
 * Guest success-screen recommendations.
 * Same priority as auth: same-movie LEAD → SUPPORTING → same-actor other films.
 */

import { readGuestRatings } from "@/hooks/useGuestRatings"
import type { RateAnotherPerf } from "@/lib/success-rate-another"

export type SuccessCarouselPerf = {
  movieSlug: string
  actorSlug: string
  movieTitle: string
  movieYear: number
  moviePosterUrl?: string | null
  actorImageUrl?: string | null
  actorName: string
}

export async function fetchGuestSuccessRecommendations(opts: {
  currentActorId: string
  currentActorSlug?: string | null
  currentActorName: string
  currentActorImageUrl?: string | null
  currentMovieId: string
}): Promise<SuccessCarouselPerf[]> {
  const { currentActorId, currentActorSlug, currentMovieId } = opts

  const exclude = readGuestRatings().map((g) => ({
    actorId: g.actorId,
    movieId: g.movieId,
  }))

  const params = new URLSearchParams({
    actorId: currentActorSlug || currentActorId,
    movieId: currentMovieId,
  })
  if (exclude.length > 0) {
    params.set("exclude", JSON.stringify(exclude))
  }

  try {
    const res = await fetch(`/api/performances/rate-another?${params.toString()}`, {
      credentials: "omit",
    })
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data.performances) ? data.performances : []
    return list.map((p: RateAnotherPerf) => ({
      movieSlug: p.movieSlug,
      actorSlug: p.actorSlug,
      movieTitle: p.movieTitle,
      movieYear: p.movieYear,
      moviePosterUrl: p.moviePosterUrl ?? null,
      actorImageUrl: p.actorImageUrl ?? null,
      actorName: p.actorName,
    }))
  } catch {
    return []
  }
}
