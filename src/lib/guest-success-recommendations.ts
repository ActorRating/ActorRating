/**
 * Guest success-screen recommendations: same actor first, then curated high-interest pairs.
 * Client-only (reads localStorage guest ratings).
 */

import {
  RECENT_PERFORMANCE_TARGETS,
  ICONIC_PERFORMANCE_TARGETS,
  HOME_LEADERBOARD_ROWS,
} from "@/lib/performances-page-targets"
import { readGuestRatings } from "@/hooks/useGuestRatings"

export type SuccessCarouselPerf = {
  movieSlug: string
  actorSlug: string
  movieTitle: string
  movieYear: number
  moviePosterUrl?: string | null
  actorImageUrl?: string | null
  actorName: string
}

const LIMIT = 6

function pairKey(actorId: string, movieId: string): string {
  return `${actorId}:${movieId}`
}

function slugPairKey(actorSlug: string, movieSlug: string): string {
  return `${actorSlug}/${movieSlug}`
}

export async function fetchGuestSuccessRecommendations(opts: {
  currentActorId: string
  currentActorSlug?: string | null
  currentActorName: string
  currentActorImageUrl?: string | null
  currentMovieId: string
}): Promise<SuccessCarouselPerf[]> {
  const {
    currentActorId,
    currentActorSlug,
    currentActorName,
    currentActorImageUrl,
    currentMovieId,
  } = opts

  const excludedIds = new Set<string>([pairKey(currentActorId, currentMovieId)])
  for (const g of readGuestRatings()) {
    excludedIds.add(pairKey(g.actorId, g.movieId))
  }

  const results: SuccessCarouselPerf[] = []
  const seenSlugPairs = new Set<string>()

  const push = (item: SuccessCarouselPerf) => {
    const sk = slugPairKey(item.actorSlug, item.movieSlug)
    if (seenSlugPairs.has(sk)) return
    seenSlugPairs.add(sk)
    results.push(item)
  }

  // 1) Same actor — other films (community activity + recency)
  try {
    const actorRes = await fetch(
      `/api/actors/${encodeURIComponent(currentActorSlug ?? currentActorId)}`,
      { credentials: "omit" },
    )
    if (actorRes.ok) {
      const data = await actorRes.json()
      const perfs = Array.isArray(data.performances) ? data.performances : []
      const sorted = [...perfs].sort((a, b) => {
        const rcA = Number(a.ratingCount ?? 0)
        const rcB = Number(b.ratingCount ?? 0)
        if (rcB !== rcA) return rcB - rcA
        return Number(b.movie?.year ?? 0) - Number(a.movie?.year ?? 0)
      })

      for (const p of sorted) {
        if (results.length >= LIMIT) break
        const movieId = p.movieId ?? p.movie?.id
        if (!movieId || excludedIds.has(pairKey(currentActorId, movieId))) continue
        const movieSlug = p.movie?.slug ?? movieId
        const actorSlug = data.slug ?? currentActorSlug ?? currentActorId
        push({
          movieSlug,
          actorSlug,
          movieTitle: p.movie?.title ?? "",
          movieYear: Number(p.movie?.year ?? 0),
          moviePosterUrl: p.movie?.posterUrl ?? null,
          actorImageUrl: data.imageUrl ?? currentActorImageUrl ?? null,
          actorName: data.name ?? currentActorName,
        })
      }
    }
  } catch {
    /* non-fatal */
  }

  // 2) Curated iconic / leaderboard / recent (high recognition)
  const curatedTargets: { actor: string; movie: string }[] = []
  const nameSeen = new Set<string>()
  const addTarget = (actor: string, movie: string) => {
    const k = `${actor}\t${movie}`
    if (nameSeen.has(k)) return
    if (actor === currentActorName) return
    nameSeen.add(k)
    curatedTargets.push({ actor, movie })
  }

  for (const row of HOME_LEADERBOARD_ROWS) addTarget(row.actor, row.movie)
  for (const t of ICONIC_PERFORMANCE_TARGETS) addTarget(t.actor, t.movie)
  for (const t of RECENT_PERFORMANCE_TARGETS) addTarget(t.actor, t.movie)

  if (results.length < LIMIT && curatedTargets.length > 0) {
    try {
      const url = `/api/performances/by-lookup?targets=${encodeURIComponent(JSON.stringify(curatedTargets))}`
      const res = await fetch(url, { credentials: "omit" })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data.performances) ? data.performances : []
        const sorted = [...list].sort(
          (a, b) => Number(b.ratingCount ?? 0) - Number(a.ratingCount ?? 0),
        )
        for (const p of sorted) {
          if (results.length >= LIMIT) break
          if (excludedIds.has(pairKey(p.actorId, p.movieId))) continue
          push({
            movieSlug: p.movie?.slug ?? p.movieId,
            actorSlug: p.actor?.slug ?? p.actorId,
            movieTitle: p.movie?.title ?? "",
            movieYear: Number(p.movie?.year ?? 0),
            moviePosterUrl: p.movie?.posterUrl ?? null,
            actorImageUrl: p.actor?.imageUrl ?? null,
            actorName: p.actor?.name ?? "",
          })
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  return results.slice(0, LIMIT)
}
