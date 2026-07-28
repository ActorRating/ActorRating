"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * App Router soft navigations + iOS Safari bfcache need manual scroll control.
 * - Forward / new links → top (or #hash)
 * - Back / forward (popstate) + bfcache pageshow → restore saved Y for that path
 *
 * Strict Mode remounts run mount → unmount → remount in one turn. Consuming a
 * one-shot sessionStorage flag on the first mount made the remount treat the
 * nav as forward and scroll to top. We keep a path-scoped restore target in
 * module scope so the remount still restores.
 */

const SCROLL_PREFIX = "ar:scroll:"
const POP_FLAG = "ar:scroll-pop"
const RESTORE_LOCK_MS = 1800

/** Next pathname change should restore (set in popstate / pageshow). */
let pendingPopRestore = false
/** Path we are actively restoring; survives Strict Mode remount. */
let restoreForPath: string | null = null

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
  const se = document.scrollingElement
  if (se) se.scrollTop = top
  window.scrollTo({ top, left: 0, behavior: "auto" })
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
  pendingPopRestore = true
  try {
    sessionStorage.setItem(POP_FLAG, "1")
  } catch {
    /* ignore */
  }
}

function peekSessionPop(): boolean {
  try {
    return sessionStorage.getItem(POP_FLAG) === "1"
  } catch {
    return false
  }
}

function clearPopFlags() {
  pendingPopRestore = false
  restoreForPath = null
  try {
    sessionStorage.removeItem(POP_FLAG)
  } catch {
    /* ignore */
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

  const delays = [40, 100, 200, 350, 550, 800, 1100, 1600]
  const timers = delays.map((ms) => window.setTimeout(apply, ms))

  const onScroll = () => {
    if (cancelled) return
    const current = getScrollY()
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
  const prevPathRef = useRef(pathname)

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
      saveScroll(prevPathRef.current)
      markPopNavigation()
    }

    /** Persist scroll before soft navigations (Link clicks) leave the page. */
    const onPointerDownCapture = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      try {
        const url = new URL(anchor.href, window.location.href)
        if (url.origin !== window.location.origin) return
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return
        }
      } catch {
        return
      }
      saveScroll(pathRef.current)
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      markPopNavigation()
      restoreForPath = pathRef.current
      cancelRestoreRef.current?.()
      cancelRestoreRef.current = restoreWithRetries(readSavedScroll(pathRef.current))
    }

    window.addEventListener("popstate", onPopState)
    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("pagehide", persist)
    window.addEventListener("beforeunload", persist)
    document.addEventListener("pointerdown", onPointerDownCapture, true)
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
      document.removeEventListener("pointerdown", onPointerDownCapture, true)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

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
    const isPop =
      pendingPopRestore ||
      peekSessionPop() ||
      restoreForPath === pathname

    if (isPop) {
      restoreForPath = pathname
      // Drop one-shot flags; path target remains for Strict Mode remount.
      pendingPopRestore = false
      try {
        sessionStorage.removeItem(POP_FLAG)
      } catch {
        /* ignore */
      }
    } else if (restoreForPath && restoreForPath !== pathname) {
      // Forward navigation while a restore window was open — cancel it.
      clearPopFlags()
    }

    const apply = () => {
      if (scrollToHash(hash)) return

      if (isPop || restoreForPath === pathname) {
        cancelRestoreRef.current = restoreWithRetries(readSavedScroll(pathname))
        return
      }

      setScrollY(0)
    }

    requestAnimationFrame(apply)
    prevPathRef.current = pathname

    const clearId = window.setTimeout(() => {
      if (restoreForPath === pathname) {
        restoreForPath = null
      }
    }, RESTORE_LOCK_MS)

    return () => {
      window.clearTimeout(clearId)
      cancelRestoreRef.current?.()
      cancelRestoreRef.current = null
      // Leave restoreForPath set so Strict Mode remount still restores.
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
