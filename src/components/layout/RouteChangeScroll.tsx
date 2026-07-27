"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

function scrollKey(pathname: string) {
  return `ar:scroll:${pathname}`
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

function scrollToHash(hash: string): boolean {
  if (!hash || hash === "#") return false
  const id = decodeURIComponent(hash.slice(1))
  const el = document.getElementById(id)
  if (!el) return false
  el.scrollIntoView({ behavior: "auto", block: "start" })
  return true
}

/**
 * Forward navigations → top (or #hash).
 * Browser back/forward → restore last scroll for that path.
 */
export default function RouteChangeScroll() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isPopRef = useRef(false)

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
      isPopRef.current = true
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
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
        saveScroll(path, window.scrollY)
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      saveScroll(path, window.scrollY)
      window.removeEventListener("scroll", onScroll)
    }
  }, [pathname])

  useEffect(() => {
    if (typeof window === "undefined") return

    const hash = window.location.hash
    const restorePop = isPopRef.current
    isPopRef.current = false

    const apply = () => {
      if (scrollToHash(hash)) return

      if (restorePop) {
        const y = readSavedScroll(pathname)
        window.scrollTo({ top: y, left: 0, behavior: "auto" })
        // Home editorial/rails can shift layout after paint — re-apply briefly.
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, left: 0, behavior: "auto" })
        })
        window.setTimeout(() => {
          window.scrollTo({ top: y, left: 0, behavior: "auto" })
        }, 80)
        return
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
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
