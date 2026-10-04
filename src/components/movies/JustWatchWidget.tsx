"use client"

import { motion } from "framer-motion"
import Script from "next/script"
import { useId, useLayoutEffect, useRef, useState } from "react"

const SCRIPT_SRC = "https://widget.justwatch.com/justwatch_widget.js"
const SCRIPT_ID = "justwatch-widget"

/** Public widget key. Override with NEXT_PUBLIC_JUSTWATCH_API_KEY if JustWatch rotates it. */
const JUSTWATCH_API_KEY =
  process.env.NEXT_PUBLIC_JUSTWATCH_API_KEY?.trim() || "8pCc7emwtOajDUs6bvhgtYWjb8LIa7Ct"

/**
 * JustWatch posts width = max(body.scrollWidth, 300). Typical dark-theme icon
 * rows are narrower (~230–250px), so a 300px frame looks left-heavy when centered.
 */
const JW_WIDTH_FLOOR_PX = 300
const ICON_ROW_FIT_PX = 246
/** Match the Rate CTA entrance on movie pages so this appears with the hero, not after. */
const ENTRANCE_DELAY_MS = 600
const REVEAL_FALLBACK_MS = 3500

declare global {
  interface Window {
    JustWatch?: { reloadWidgets: () => void }
  }
}

function preloadJustWatchScript() {
  if (typeof document === "undefined") return
  if (document.querySelector(`link[data-jw-preload="1"]`)) return
  const link = document.createElement("link")
  link.rel = "preload"
  link.as = "script"
  link.href = SCRIPT_SRC
  link.dataset.jwPreload = "1"
  document.head.appendChild(link)
}

function reloadJustWatchWidgets() {
  if (typeof window.JustWatch?.reloadWidgets !== "function") return
  if (document.querySelectorAll("[data-jw-widget]").length < 1) return
  window.JustWatch.reloadWidgets()
}

function applyIframeWidth(iframe: HTMLIFrameElement, widthPx: number) {
  const parentWidth = iframe.parentElement?.clientWidth ?? widthPx
  const clamped = Math.max(120, Math.min(Math.round(widthPx), parentWidth || widthPx))
  iframe.style.display = "block"
  iframe.style.margin = "0"
  iframe.style.maxWidth = "100%"
  iframe.style.width = `${clamped}px`
  iframe.setAttribute("width", String(clamped))
}

function applyIframeHeight(iframe: HTMLIFrameElement, heightPx: number) {
  const h = Math.max(1, Math.round(heightPx))
  iframe.style.height = `${h}px`
  iframe.setAttribute("height", String(h))
}

/**
 * JustWatch "where to watch" for one movie. The partner script is loaded once
 * (Next dedupes Script by id). US offers only, per the current partner setup.
 * The JustWatch credit link is required by their terms.
 */
export function JustWatchWidget({
  title,
  year,
}: {
  title: string
  year?: number | null
}) {
  const reactId = useId().replace(/:/g, "")
  const titleValue = title.trim()
  const yearValue = year != null && year > 0 ? String(year) : ""
  const hostId = `jw-host-${reactId}`
  const fittedWidthRef = useRef<number | null>(null)
  const mountMsRef = useRef(0)
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    if (!titleValue || !yearValue) return

    preloadJustWatchScript()
    mountMsRef.current = performance.now()

    const host = document.getElementById(hostId)
    if (!host) return

    let cancelled = false
    let revealed = false
    let revealTimer: number | undefined

    const getIframe = () => host.querySelector<HTMLIFrameElement>("iframe.jw-widget-iframe")

    /** Size off-screen, then fade in with the Rate button entrance timing. */
    const scheduleReveal = () => {
      if (revealed || cancelled) return
      revealed = true
      const elapsed = performance.now() - mountMsRef.current
      const wait = Math.max(0, ENTRANCE_DELAY_MS - elapsed)
      revealTimer = window.setTimeout(() => {
        if (!cancelled) setVisible(true)
      }, wait)
    }

    const lockFittedWidth = (iframe: HTMLIFrameElement) => {
      const fitted = fittedWidthRef.current
      if (fitted == null) return
      if (Math.abs(iframe.offsetWidth - fitted) > 1) {
        applyIframeWidth(iframe, fitted)
      }
    }

    const prepareIframe = (iframe: HTMLIFrameElement) => {
      if (iframe.dataset.jwPrepared === "1") {
        lockFittedWidth(iframe)
        return
      }
      iframe.dataset.jwPrepared = "1"
      // Final width up front so the first painted frame is already centered.
      applyIframeWidth(iframe, ICON_ROW_FIT_PX)
      fittedWidthRef.current = ICON_ROW_FIT_PX
    }

    const scan = () => {
      const iframe = getIframe()
      if (iframe) prepareIframe(iframe)
    }

    const onMessage = (event: MessageEvent) => {
      if (!event.data || event.data.sender !== "jw_widget") return
      const iframe = getIframe()
      if (!iframe) return

      if (event.data.type === "resize-height" && typeof event.data.cssHeight === "string") {
        const h = Number.parseFloat(event.data.cssHeight)
        if (Number.isFinite(h) && h > 0) {
          applyIframeHeight(iframe, h)
          // Content is in — keep width tight unless a wide resize arrives.
          if (fittedWidthRef.current == null) {
            applyIframeWidth(iframe, ICON_ROW_FIT_PX)
            fittedWidthRef.current = ICON_ROW_FIT_PX
          }
          if (h > 20) scheduleReveal()
        }
      }

      if (event.data.type === "resize-width" && typeof event.data.cssWidth === "string") {
        const w = Number.parseFloat(event.data.cssWidth)
        if (!Number.isFinite(w) || w <= 0) return

        if (w > JW_WIDTH_FLOOR_PX) {
          applyIframeWidth(iframe, w)
          fittedWidthRef.current = Math.round(w)
          scheduleReveal()
          return
        }

        // Ignore their ≥300 floor — keep the tight centered width.
        lockFittedWidth(iframe)
      }
    }

    reloadJustWatchWidgets()
    scan()

    const obs = new MutationObserver(scan)
    obs.observe(host, { childList: true, subtree: true })
    window.addEventListener("message", onMessage)

    const lockInterval = window.setInterval(() => {
      const iframe = getIframe()
      if (iframe) lockFittedWidth(iframe)
    }, 500)

    const fallbackTimer = window.setTimeout(() => {
      if (fittedWidthRef.current == null) {
        const iframe = getIframe()
        if (iframe) {
          applyIframeWidth(iframe, ICON_ROW_FIT_PX)
          fittedWidthRef.current = ICON_ROW_FIT_PX
        }
      }
      scheduleReveal()
    }, REVEAL_FALLBACK_MS)

    return () => {
      cancelled = true
      window.clearTimeout(revealTimer)
      window.clearTimeout(fallbackTimer)
      window.clearInterval(lockInterval)
      obs.disconnect()
      window.removeEventListener("message", onMessage)
      fittedWidthRef.current = null
    }
  }, [titleValue, yearValue, hostId])

  if (!titleValue || !yearValue) return null

  return (
    <motion.div
      id={hostId}
      className="jw-widget-host mx-auto mb-6 mt-1 flex w-full max-w-2xl flex-col items-center sm:mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        key={`${titleValue}-${yearValue}`}
        data-jw-widget
        data-api-key={JUSTWATCH_API_KEY}
        data-object-type="movie"
        data-title={titleValue}
        data-year={yearValue}
        data-theme="dark"
      />
      <a
        href="https://www.justwatch.com/us/"
        target="_blank"
        rel="noopener noreferrer"
        className="jw-widget-credit"
        style={{
          display: "inline-flex",
          justifyContent: "center",
          marginTop: "0.5rem",
          fontSize: "11px",
          fontFamily: "sans-serif",
          color: "#d8d8d8",
          textDecoration: "none",
          alignItems: "center",
        }}
      >
        Streaming details by JustWatch
      </a>
      <Script
        id={SCRIPT_ID}
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => {
          reloadJustWatchWidgets()
        }}
      />
    </motion.div>
  )
}
