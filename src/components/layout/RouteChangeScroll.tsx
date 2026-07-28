"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { usePathname } from "next/navigation"

/**
 * Scroll restoration for App Router (landing → story/news → back).
 *
 * Root bug we hit in testing: Next scrolls the window to 0 *before* the
 * pathname updates, and a scroll listener / effect cleanup wrote
 * sessionStorage scroll_/=0 over the real position. Never clobber a deep
 * saved Y with a near-zero value.
 */

const KEY = (path: string) => `scroll_${path}`
const RESTORE_WINDOW_MS = 2500

let pendingTraverse = false
let activeRestore: { path: string; stop: () => void } | null = null

function getY(): number {
  const se = document.scrollingElement
  return (
    window.scrollY ||
    se?.scrollTop ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  )
}

function setY(y: number) {
  const top = Math.max(0, Math.round(y))
  const se = document.scrollingElement
  if (se) se.scrollTop = top
  document.documentElement.scrollTop = top
  document.body.scrollTop = top
  window.scrollTo(0, top)
}

function read(path: string): number | null {
  try {
    const raw = sessionStorage.getItem(KEY(path))
    if (raw == null) return null
    const y = Number.parseInt(raw, 10)
    return Number.isFinite(y) ? y : null
  } catch {
    return null
  }
}

/** Persist scroll. Never replace a deep position with ~0 (Next pre-nav reset). */
function save(path: string, y = getY(), opts?: { force?: boolean }) {
  // While restoring this path, ignore transient Y writes.
  if (!opts?.force && activeRestore?.path === path) return

  const next = Math.max(0, Math.round(y))
  if (!opts?.force) {
    const existing = read(path)
    if (existing != null && existing > 80 && next < 24) return
  }
  try {
    sessionStorage.setItem(KEY(path), String(next))
  } catch {
    /* ignore */
  }
}

function stopActiveRestore() {
  activeRestore?.stop()
  activeRestore = null
}

function startRestore(path: string) {
  const y = read(path)
  if (y == null || y <= 0) return

  if (activeRestore?.path === path) {
    setY(y)
    return
  }

  stopActiveRestore()

  let stopped = false
  const nativeScrollTo = window.scrollTo.bind(window)

  window.scrollTo = ((...args: Parameters<typeof window.scrollTo>) => {
    if (stopped) return nativeScrollTo(...args)
    let top = 0
    if (typeof args[0] === "number") top = Number(args[1] ?? 0)
    else if (args[0] && typeof args[0] === "object") {
      top = Number((args[0] as ScrollToOptions).top ?? 0)
    }
    if (top < 24 && y > 80) return nativeScrollTo(0, y)
    return nativeScrollTo(...args)
  }) as typeof window.scrollTo

  const apply = () => {
    if (!stopped) setY(y)
  }

  apply()
  const raf1 = requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })

  const timers = [0, 32, 80, 160, 280, 450, 700, 1100, 1600, 2200].map((ms) =>
    window.setTimeout(apply, ms),
  )

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => apply())
      : null
  ro?.observe(document.documentElement)
  if (document.body) ro?.observe(document.body)

  const onScroll = () => {
    if (stopped) return
    if (getY() < 24 && y > 80) apply()
  }
  window.addEventListener("scroll", onScroll, { passive: true })

  const done = window.setTimeout(() => stop(), RESTORE_WINDOW_MS)

  function stop() {
    if (stopped) return
    stopped = true
    window.scrollTo = nativeScrollTo
    window.removeEventListener("scroll", onScroll)
    ro?.disconnect()
    window.clearTimeout(done)
    cancelAnimationFrame(raf1)
    for (const t of timers) window.clearTimeout(t)
    if (activeRestore?.path === path) activeRestore = null
    // Re-pin the restored position so later noise cannot shrink it.
    save(path, y, { force: true })
    setY(y)
  }

  activeRestore = { path, stop }
}

function markTraverse() {
  pendingTraverse = true
}

function consumeTraverse(): boolean {
  const v = pendingTraverse
  pendingTraverse = false
  return v
}

function isInternalNavAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false
  const href = anchor.getAttribute("href")
  if (!href || href.startsWith("#")) return false
  try {
    const url = new URL(anchor.href, window.location.href)
    if (url.origin !== window.location.origin) return false
    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

function pinScrollBeforeNav(path: string) {
  // Force-write the real position at click time so later 0-saves cannot win.
  save(path, getY(), { force: true })
}

export default function RouteChangeScroll() {
  const pathname = usePathname()
  const pathRef = useRef(pathname)
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual"
      }
    } catch {
      /* ignore */
    }

    const persist = () => save(pathRef.current)

    const onPopState = () => {
      save(prevPathRef.current)
      markTraverse()
      startRestore(window.location.pathname)
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      markTraverse()
      startRestore(pathRef.current)
    }

    const nav = (
      window as Window & {
        navigation?: {
          addEventListener: (t: string, fn: (e: Event) => void) => void
          removeEventListener: (t: string, fn: (e: Event) => void) => void
        }
      }
    ).navigation

    const onNavigate = (event: Event) => {
      const e = event as Event & {
        navigationType?: string
        destination?: { url?: string }
      }
      if (e.navigationType === "traverse") {
        markTraverse()
        try {
          const path = e.destination?.url
            ? new URL(e.destination.url).pathname
            : window.location.pathname
          startRestore(path)
        } catch {
          startRestore(window.location.pathname)
        }
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!isInternalNavAnchor(anchor)) return
      pinScrollBeforeNav(pathRef.current)
    }

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!isInternalNavAnchor(anchor)) return
      pinScrollBeforeNav(pathRef.current)
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist()
    }

    window.addEventListener("popstate", onPopState)
    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("pagehide", persist)
    window.addEventListener("beforeunload", persist)
    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("click", onClickCapture, true)
    document.addEventListener("visibilitychange", onVisibility)
    nav?.addEventListener("navigate", onNavigate)

    return () => {
      persist()
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("pageshow", onPageShow)
      window.removeEventListener("pagehide", persist)
      window.removeEventListener("beforeunload", persist)
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("click", onClickCapture, true)
      document.removeEventListener("visibilitychange", onVisibility)
      nav?.removeEventListener("navigate", onNavigate)
    }
  }, [])

  useEffect(() => {
    const path = pathname
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        if (activeRestore?.path === path) {
          ticking = false
          return
        }
        save(path)
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("touchend", onScroll, { passive: true })
    return () => {
      // Cleanup must not write 0 over a pinned deep scroll (guard inside save).
      save(path)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("touchend", onScroll)
    }
  }, [pathname])

  useLayoutEffect(() => {
    const prev = prevPathRef.current
    const pathChanged = prev !== pathname
    prevPathRef.current = pathname

    const hash = window.location.hash
    if (hash && hash !== "#") {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) {
        stopActiveRestore()
        el.scrollIntoView({ behavior: "auto", block: "start" })
        pendingTraverse = false
        return
      }
    }

    const t = window.setTimeout(() => {
      const traverse =
        consumeTraverse() ||
        activeRestore?.path === pathname ||
        (pathChanged && shouldTreatAsBack(pathname, prev))

      if (traverse) {
        startRestore(pathname)
        return
      }

      if (pathChanged) {
        stopActiveRestore()
        setY(0)
      }
    }, 0)

    return () => {
      window.clearTimeout(t)
    }
  }, [pathname])

  return null
}

function shouldTreatAsBack(pathname: string, prevPath: string): boolean {
  if (pathname === prevPath) return false
  const saved = read(pathname)
  if (saved == null || saved <= 80) return false
  const fromArticle =
    /^\/(stories|news)\/[^/]+$/.test(prevPath) ||
    /^\/(actors|movies|rate)\//.test(prevPath)
  const toList =
    pathname === "/" ||
    pathname === "/stories" ||
    pathname === "/news" ||
    pathname === "/discover"
  return fromArticle && toList
}
