"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { trackQualifiedVisit } from "@/lib/analytics"
import { getCurrentPageViewId, pageViewKey } from "@/lib/analytics/pageview-client"
import {
  createQualifiedVisitState,
  flushVisibleTime,
  markFired,
  markInteraction,
  onVisibilityChange,
  shouldFireQualifiedVisit,
  scrollPastThreshold,
  type QualifiedVisitState,
} from "@/lib/analytics/qualified-visit"
import {
  hasQualifiedVisitBeenSent,
  markQualifiedVisitSent,
  qualifiedVisitStorageKey,
} from "@/lib/analytics/qualified-visit-storage"

/**
 * Fires first-party `qualified_visit` once per page load when the tab has been
 * visible ≥5s and the user has scrolled / moved / touched / typed.
 * Passive listeners only — must not affect rating UI or Core Web Vitals.
 * sessionStorage (`qv:{pathname}{search}`) survives remounts; in-memory `fired` is the fast path.
 */
export function QualifiedVisitTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const stateRef = useRef<QualifiedVisitState>(createQualifiedVisitState())
  const keyRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return

    const search = searchParams?.toString() ? `?${searchParams.toString()}` : ""
    const key = `${pathname}${search}`
    const storageKey = qualifiedVisitStorageKey(pathname, search)
    if (keyRef.current !== key) {
      keyRef.current = key
      stateRef.current = createQualifiedVisitState()
      // Remount / Strict Mode: storage says already sent → treat as fired.
      if (hasQualifiedVisitBeenSent(storageKey)) {
        stateRef.current = markFired(stateRef.current)
      } else if (document.visibilityState === "visible") {
        stateRef.current = onVisibilityChange(stateRef.current, true, performance.now())
      }
    }

    const tryFire = () => {
      const now = performance.now()
      stateRef.current = flushVisibleTime(stateRef.current, now)
      if (hasQualifiedVisitBeenSent(storageKey)) {
        if (!stateRef.current.fired) {
          stateRef.current = markFired(stateRef.current)
        }
        return
      }
      if (!shouldFireQualifiedVisit(stateRef.current, now)) return
      const interaction = stateRef.current.lastInteraction
      const dwellMs = Math.round(stateRef.current.visibleAccumulatedMs)
      stateRef.current = markFired(stateRef.current)
      markQualifiedVisitSent(storageKey)
      trackQualifiedVisit({
        interaction,
        dwell_ms: dwellMs,
        pageview_id: getCurrentPageViewId(pageViewKey(pathname, search)),
      })
    }

    const onVis = () => {
      stateRef.current = onVisibilityChange(
        stateRef.current,
        document.visibilityState === "visible",
        performance.now(),
      )
      tryFire()
    }

    const onPointer = () => {
      stateRef.current = markInteraction(stateRef.current, "pointermove")
      tryFire()
    }
    const onTouch = () => {
      stateRef.current = markInteraction(stateRef.current, "touchstart")
      tryFire()
    }
    const onKey = () => {
      stateRef.current = markInteraction(stateRef.current, "keydown")
      tryFire()
    }
    const onScroll = () => {
      const doc = document.documentElement
      if (
        scrollPastThreshold(
          window.scrollY || doc.scrollTop,
          window.innerHeight,
          doc.scrollHeight,
        )
      ) {
        stateRef.current = markInteraction(stateRef.current, "scroll")
        tryFire()
      }
    }

    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("pointermove", onPointer, { passive: true, once: true })
    window.addEventListener("touchstart", onTouch, { passive: true, once: true })
    window.addEventListener("keydown", onKey, { passive: true, once: true })
    window.addEventListener("scroll", onScroll, { passive: true })

    // Cheap dwell ticker while visible (1s) — avoids rAF loops.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      tryFire()
    }, 1000)

    tryFire()

    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pointermove", onPointer)
      window.removeEventListener("touchstart", onTouch)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", onScroll)
      window.clearInterval(intervalId)
    }
  }, [pathname, searchParams])

  return null
}
