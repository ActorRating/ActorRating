"use client"

import { useState, useEffect, useCallback } from "react"

export const GUEST_RATINGS_KEY = "guestRatings"
export const GUEST_RATINGS_COUNT_KEY = "guestRatingsCount"
/** Max free-pass ratings before signup is required. */
export const GUEST_RATING_LIMIT = 3

export interface GuestRating {
  actorId: string
  movieId: string
  actorName: string
  movieTitle: string
  movieYear: number
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  comment?: string
  timestamp: string
}

// ─── Pure localStorage helpers (safe to call outside React) ─────────────────

export function readGuestRatings(): GuestRating[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(GUEST_RATINGS_KEY)
    return raw ? (JSON.parse(raw) as GuestRating[]) : []
  } catch {
    return []
  }
}

export function readGuestRatingsCount(): number {
  if (typeof window === "undefined") return 0
  try {
    const raw = localStorage.getItem(GUEST_RATINGS_COUNT_KEY)
    return raw ? parseInt(raw, 10) : 0
  } catch {
    return 0
  }
}

export function clearGuestRatingsStorage(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(GUEST_RATINGS_KEY)
  localStorage.removeItem(GUEST_RATINGS_COUNT_KEY)
}

// ─── React hook ─────────────────────────────────────────────────────────────

export function useGuestRatings() {
  const [count, setCount] = useState(0)
  const [ratings, setRatings] = useState<GuestRating[]>([])

  // Hydrate from localStorage once on mount (avoids SSR mismatch)
  useEffect(() => {
    setCount(readGuestRatingsCount())
    setRatings(readGuestRatings())
  }, [])

  /**
   * Persist a guest rating.
   * If a rating for the same actorId+movieId already exists it is updated in place
   * (count is NOT incremented again). Returns the new total unique-performance count.
   */
  const addRating = useCallback((rating: GuestRating): number => {
    const existing = readGuestRatings()
    const idx = existing.findIndex(
      (r) => r.actorId === rating.actorId && r.movieId === rating.movieId
    )

    let updated: GuestRating[]
    let newCount: number

    if (idx >= 0) {
      updated = [...existing]
      updated[idx] = rating
      newCount = readGuestRatingsCount()
    } else {
      updated = [...existing, rating]
      newCount = readGuestRatingsCount() + 1
    }

    localStorage.setItem(GUEST_RATINGS_KEY, JSON.stringify(updated))
    localStorage.setItem(GUEST_RATINGS_COUNT_KEY, String(newCount))
    setRatings(updated)
    setCount(newCount)
    return newCount
  }, [])

  const clearAll = useCallback(() => {
    clearGuestRatingsStorage()
    setRatings([])
    setCount(0)
  }, [])

  const hasRatedPerformance = useCallback(
    (actorId: string, movieId: string): boolean =>
      readGuestRatings().some((r) => r.actorId === actorId && r.movieId === movieId),
    []
  )

  return { count, ratings, addRating, clearAll, hasRatedPerformance }
}
