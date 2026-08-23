"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { usePathname } from "next/navigation"

/**
 * Scroll restoration for App Router list → detail → back.
 * Only restores on browser back/forward — never hijacks forward link clicks.
 */

const KEY = (path: string) => `scroll_${path}`
const PIN_KEY = (path: string) => `scrollpin_${path}`

type ScrollPin = {
  href: string
  pathname: string
  offset: number
  y: number
}

let pendingTraverse = false

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

function save(path: string, y = getY()) {
  const next = Math.max(0, Math.round(y))
  if (next < 24) {
    const existing = read(path)
    if (existing != null && existing > 80) return
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

function restoreScroll(path: string) {
  const pin = readPin(path)
  const y = pin?.y ?? read(path)
  if (y == null || y <= 0) return

  const apply = () => {
    if (pin) {
      const el = findPinnedAnchor(pin)
      if (el) {
        const delta = el.getBoundingClientRect().top - pin.offset
        if (Math.abs(delta) > 1) {
          setY(getY() + delta)
          return
        }
      }
    }
    setY(y)
  }

  apply()
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
}

function markTraverse() {
  pendingTraverse = true
}

function consumeTraverse(): boolean {
  const v = pendingTraverse
  pendingTraverse = false
  return v
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
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) markTraverse()
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
      const e = event as Event & { navigationType?: string }
      if (e.navigationType === "traverse") markTraverse()
    }

    window.addEventListener("popstate", onPopState)
    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("pagehide", persist)
    window.addEventListener("beforeunload", persist)
    nav?.addEventListener("navigate", onNavigate)

    return () => {
      persist()
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("pageshow", onPageShow)
      window.removeEventListener("pagehide", persist)
      window.removeEventListener("beforeunload", persist)
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
        save(path)
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      save(path)
      window.removeEventListener("scroll", onScroll)
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
        el.scrollIntoView({ behavior: "auto", block: "start" })
        pendingTraverse = false
        return
      }
    }

    if (consumeTraverse()) {
      restoreScroll(pathname)
      return
    }

    if (pathChanged) {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return null
}
