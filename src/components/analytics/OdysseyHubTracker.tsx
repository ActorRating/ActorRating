"use client"

import { useEffect, useRef } from "react"
import { trackHubRateClick, trackHubView } from "@/lib/analytics"

/**
 * First-party ProductEvents for the best-performances hub:
 * hub_view once per load; hub_rate_click on Rate link clicks (performance id).
 */
export function OdysseyHubTracker({
  movieSlug,
  movieTitle,
}: {
  movieSlug: string
  movieTitle: string
}) {
  const viewed = useRef(false)

  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    trackHubView({ movie: movieTitle, movie_slug: movieSlug })
  }, [movieSlug, movieTitle])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest("a[data-hub-rate-performance-id]")
      if (!(link instanceof HTMLAnchorElement)) return
      const performanceId = link.getAttribute("data-hub-rate-performance-id")
      if (!performanceId) return
      trackHubRateClick({
        performance_id: performanceId,
        movie: movieTitle,
        movie_slug: movieSlug,
      })
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [movieSlug, movieTitle])

  return null
}
