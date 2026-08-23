"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { usePathname } from "next/navigation"

/**
 * Scroll restoration for App Router (landing → story/news → back).
 *
 * Saves window Y plus the clicked link's viewport offset so back lands on the
 * same card, not just roughly the same scroll depth.
 */

const KEY = (path: string) => `scroll_${path}`
const PIN_KEY = (path: string) => `scrollpin_${path}`
const RESTORE_WINDOW_MS = 2800

type ScrollPin = {
  href: string
  pathname: string
  offset: number
  y: number
}

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

function readPin(path: string): ScrollPin | null {
  try {
    const raw = sessionStorage.getItem(PIN_KEY(path))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ScrollPin
    if (!parsed || typeof parsed.y !== "number") return null
    return parsed
  } catch {
    return null
  }
}

function writePin(path: string, pin: ScrollPin) {
  try {
    sessionStorage.setItem(PIN_KEY(path), JSON.stringify(pin))
  } catch {
    /* ignore */
  }
}

/** Persist scroll. Never replace a deep position with ~0 (Next pre-nav reset). */
function save(path: string, y = getY(), opts?: { force?: boolean }) {
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

function findPinnedAnchor(pin: ScrollPin): HTMLAnchorElement | null {
  const anchors = Array.from(
    document.querySelectorAll("a[href]"),
  ) as HTMLAnchorElement[]
  return (
    anchors.find((a) => {
      const attr = a.getAttribute("href") || ""
      if (pin.href && (attr === pin.href || attr.startsWith(pin.href + "?"))) {
        return true
      }
      try {
        return new URL(a.href, window.location.origin).pathname === pin.pathname
      } catch {
        return false
      }
    }) ?? null
  )
}

function alignToPin(pin: ScrollPin) {
  const el = findPinnedAnchor(pin)
  if (!el) {
    setY(pin.y)
    return
  }
  const top = el.getBoundingClientRect().top
  const delta = top - pin.offset
  if (Math.abs(delta) > 1) {
    setY(getY() + delta)
  }
}

function stopActiveRestore() {
  activeRestore?.stop()
  activeRestore = null
}

function startRestore(path: string) {
  const pin = readPin(path)
  const y = pin?.y ?? read(path)
  if (y == null || y <= 0) return

  if (activeRestore?.path === path) {
    if (pin) alignToPin(pin)
    else setY(y)
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
    if (top < 24 && y > 80) {
      if (pin) {
        alignToPin(pin)
        return
      }
      return nativeScrollTo(0, y)
    }
    return nativeScrollTo(...args)
  }) as typeof window.scrollTo

  const apply = () => {
    if (stopped) return
    if (pin) alignToPin(pin)
    else setY(y)
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
    apply()
    save(path, getY(), { force: true })
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

function isEditorialListPath(path: string): boolean {
  return path === "/news" || path === "/stories"
}

function isEditorialDetailPath(path: string): boolean {
  return /^\/(news|stories)\/[^/]+$/.test(path)
}

function pinScrollBeforeNav(path: string, anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") || ""
  let pathname = href
  try {
    pathname = new URL(anchor.href, window.location.href).pathname
  } catch {
    /* keep href */
  }

  // Only pin when opening a journal article from a list (back-button restore).
  if (!isEditorialListPath(path) || !isEditorialDetailPath(pathname)) return

  const y = Math.round(getY())
  const rect = anchor.getBoundingClientRect()

  save(path, y, { force: true })
  writePin(path, {
    href,
    pathname,
    offset: Math.round(rect.top),
    y,
  })
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
      pinScrollBeforeNav(pathRef.current, anchor)
    }

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!isInternalNavAnchor(anchor)) return
      pinScrollBeforeNav(pathRef.current, anchor)
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
  const pin = readPin(pathname)
  if ((saved == null || saved <= 80) && !pin) return false
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
