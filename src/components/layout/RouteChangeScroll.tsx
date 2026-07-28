"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const SCROLL_PREFIX = "ar:scroll:"
const POP_FLAG = "ar:scroll-pop"

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
  window.scrollTo(0, top)
  // iOS Safari sometimes ignores window.scrollTo until both are set.
  document.documentElement.scrollTop = top
  document.body.scrollTop = top
}

function readSavedScroll(pathname: string): number {
  try {
    const raw = sessionStorage.getItem(scrollKey(pathname))
    const y = raw == null ? 0 : Number(raw)
    return Number.isFinite(y) && y > 0 ? y : 0
  } catch {
    return 0
  }
}

function saveScroll(pathname: string, y: number) {
  try {
    sessionStorage.setItem(scrollKey(pathname), String(Math.max(0, Math.round(y))))
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

function restoreWithRetries(y: number) {
  setScrollY(y)
  // Mobile layouts (images, editorial rails) shift after first paint.
  const delays = [0, 50, 120, 250, 450]
  for (const ms of delays) {
    window.setTimeout(() => setScrollY(y), ms)
  }
}

/**
 * Forward navigations → top (or #hash).
 * Browser back/forward (incl. mobile) → restore last scroll for that path.
 */
export default function RouteChangeScroll() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pathRef = useRef(pathname)

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

    const onPopState = () => {
      markPopNavigation()
    }
    // bfcache restore (common on iOS Safari when leaving/returning to the tab/app).
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        markPopNavigation()
        const y = readSavedScroll(pathRef.current)
        restoreWithRetries(y)
      }
    }
    const persist = () => {
      saveScroll(pathRef.current, getScrollY())
    }

    window.addEventListener("popstate", onPopState)
    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("pagehide", persist)
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("pageshow", onPageShow)
      window.removeEventListener("pagehide", persist)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  // Keep scroll position for the current path (used when returning via Back).
  useEffect(() => {
    if (typeof window === "undefined") return
    const path = pathname
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        saveScroll(path, getScrollY())
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    // capture scroll on touch end — iOS often fires this after rubber-band settle
    window.addEventListener("touchend", onScroll, { passive: true })
    return () => {
      saveScroll(path, getScrollY())
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("touchend", onScroll)
    }
  }, [pathname])

  useEffect(() => {
    if (typeof window === "undefined") return

    const hash = window.location.hash
    const restorePop = consumePopNavigation()

    const apply = () => {
      if (scrollToHash(hash)) return

      if (restorePop) {
        restoreWithRetries(readSavedScroll(pathname))
        return
      }

      setScrollY(0)
    }

    requestAnimationFrame(apply)
  }, [pathname, searchParams])

  // Same-route hash changes (e.g. / → /#waitlist) don't update pathname.
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
