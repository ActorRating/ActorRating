"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * App Router soft navigations + iOS Safari bfcache need manual scroll control.
 * - Forward / new links → top (or #hash)
 * - Back / forward (popstate) + bfcache pageshow → restore saved Y for that path
 *
 * @see history.scrollRestoration = "manual"
 */

const SCROLL_PREFIX = "ar:scroll:"
const POP_FLAG = "ar:scroll-pop"
const RESTORE_LOCK_MS = 1200

function scrollKey(pathname: string) {
  return `${SCROLL_PREFIX}${pathname}`
}

function getScrollY(): number {
  if (typeof window === "undefined") return 0
  return (
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  )
}

function setScrollY(y: number) {
  const top = Math.max(0, Math.round(y))
  // Prefer the scrolling element (html on modern browsers; body on some WebKits).
  const se = document.scrollingElement
  if (se) se.scrollTop = top
  window.scrollTo(0, top)
  document.documentElement.scrollTop = top
  document.body.scrollTop = top
}

function readSavedScroll(pathname: string): number {
  try {
    const raw = sessionStorage.getItem(scrollKey(pathname))
    if (raw == null) return 0
    const y = Number.parseInt(raw, 10)
    return Number.isFinite(y) && y > 0 ? y : 0
  } catch {
    return 0
  }
}

function saveScroll(pathname: string, y?: number) {
  try {
    const value = Math.max(0, Math.round(y ?? getScrollY()))
    sessionStorage.setItem(scrollKey(pathname), String(value))
  } catch {
    /* private mode / quota */
  }
}

function markPopNavigation() {
  try {
    sessionStorage.setItem(POP_FLAG, "1")
  } catch {
    /* ignore */
  }
}

function consumePopNavigation(): boolean {
  try {
    const flagged = sessionStorage.getItem(POP_FLAG) === "1"
    if (flagged) sessionStorage.removeItem(POP_FLAG)
    return flagged
  } catch {
    return false
  }
}

function scrollToHash(hash: string): boolean {
  if (!hash || hash === "#") return false
  const id = decodeURIComponent(hash.slice(1))
  const el = document.getElementById(id)
  if (!el) return false
  el.scrollIntoView({ behavior: "auto", block: "start" })
  return true
}

/**
 * Re-apply scroll after layout/images settle, and briefly resist SPA frameworks
 * that reset to Y=0 after paint (common with Next App Router + iOS).
 */
function restoreWithRetries(y: number): () => void {
  if (y <= 0) return () => {}

  let cancelled = false
  const apply = () => {
    if (!cancelled) setScrollY(y)
  }

  apply()
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })

  const delays = [50, 100, 200, 350, 550, 800, 1100]
  const timers = delays.map((ms) => window.setTimeout(apply, ms))

  const onScroll = () => {
    if (cancelled) return
    const current = getScrollY()
    // Something snapped us near the top while we expected a deep restore.
    if (current < 24 && y > 80) apply()
  }
  window.addEventListener("scroll", onScroll, { passive: true })

  const unlock = window.setTimeout(() => {
    cancelled = true
    window.removeEventListener("scroll", onScroll)
  }, RESTORE_LOCK_MS)

  return () => {
    cancelled = true
    window.removeEventListener("scroll", onScroll)
    window.clearTimeout(unlock)
    for (const t of timers) window.clearTimeout(t)
  }
}

export default function RouteChangeScroll() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pathRef = useRef(pathname)
  const cancelRestoreRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (typeof window === "undefined") return

    if ("scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual"
      } catch {
        /* ignore */
      }
    }

    const persist = () => saveScroll(pathRef.current)

    const onPopState = () => {
      // URL has already changed; persist the path we're leaving isn't possible
      // here — scroll was saved continuously / on pagehide. Mark restore.
      markPopNavigation()
    }

    // iOS Safari bfcache: full page state restored without a normal reload.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      markPopNavigation()
      cancelRestoreRef.current?.()
      cancelRestoreRef.current = restoreWithRetries(readSavedScroll(pathRef.current))
    }

    window.addEventListener("popstate", onPopState)
    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("pagehide", persist)
    window.addEventListener("beforeunload", persist)
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      persist()
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("pageshow", onPageShow)
      window.removeEventListener("pagehide", persist)
      window.removeEventListener("beforeunload", persist)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  // Continuously snapshot scroll for the active path (SPA Link navigations
  // do not fire beforeunload).
  useEffect(() => {
    if (typeof window === "undefined") return
    const path = pathname
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        saveScroll(path)
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("touchend", onScroll, { passive: true })
    return () => {
      saveScroll(path)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("touchend", onScroll)
    }
  }, [pathname])

  useEffect(() => {
    if (typeof window === "undefined") return

    cancelRestoreRef.current?.()
    cancelRestoreRef.current = null

    const hash = window.location.hash
    const restorePop = consumePopNavigation()

    const apply = () => {
      if (scrollToHash(hash)) return

      if (restorePop) {
        cancelRestoreRef.current = restoreWithRetries(readSavedScroll(pathname))
        return
      }

      setScrollY(0)
    }

    // Wait one frame so the new route's DOM is in the tree (SPA soft nav).
    requestAnimationFrame(apply)

    return () => {
      cancelRestoreRef.current?.()
      cancelRestoreRef.current = null
    }
  }, [pathname, searchParams])

  useEffect(() => {
    if (typeof window === "undefined") return
    const onHashChange = () => {
      scrollToHash(window.location.hash)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  return null
}
