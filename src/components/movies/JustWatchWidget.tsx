"use client"

import Script from "next/script"
import { useEffect, useId, useRef } from "react"

const SCRIPT_SRC = "https://widget.justwatch.com/justwatch_widget.js"
const SCRIPT_ID = "justwatch-widget"

/** Public widget key. Override with NEXT_PUBLIC_JUSTWATCH_API_KEY if JustWatch rotates it. */
const JUSTWATCH_API_KEY =
  process.env.NEXT_PUBLIC_JUSTWATCH_API_KEY?.trim() || "8pCc7emwtOajDUs6bvhgtYWjb8LIa7Ct"

/**
 * JustWatch posts width = max(body.scrollWidth, 300). Typical dark-theme icon
 * rows are narrower (~230–250px), so a 300px frame looks left-heavy when centered.
 * We snap to a tight default once, and only widen if that wraps the row.
 */
const JW_WIDTH_FLOOR_PX = 300
const ICON_ROW_FIT_PX = 246
/** JustWatch polls size every 150ms; wait slightly longer for a postMessage. */
const FIT_PROBE_MS = 180
const REVEAL_FALLBACK_MS = 3500

declare global {
  interface Window {
    JustWatch?: { reloadWidgets: () => void }
  }
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
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

  useEffect(() => {
    if (!titleValue || !yearValue) return

    const host = document.getElementById(hostId)
    if (!host) return

    let lastHeight = 0
    let settling = false
    let settleTimer: number | undefined
    let cancelled = false
    let revealed = false

    const getIframe = () => host.querySelector<HTMLIFrameElement>("iframe.jw-widget-iframe")

    const reveal = () => {
      if (revealed || cancelled) return
      revealed = true
      host.style.height = ""
      host.style.overflow = ""
      host.classList.add("jw-widget-host--ready")
    }

    const lockFittedWidth = (iframe: HTMLIFrameElement) => {
      const fitted = fittedWidthRef.current
      if (fitted == null) return
      if (Math.abs(iframe.offsetWidth - fitted) > 1) {
        applyIframeWidth(iframe, fitted)
      }
    }

    /**
     * One or two width snaps while the host is still opacity:0, then fade in.
     * Avoids the old multi-step binary search that was visible as a load glitch.
     */
    const settleIframeWidth = async (iframe: HTMLIFrameElement) => {
      if (cancelled || settling || fittedWidthRef.current != null) return
      if (lastHeight < 20) return

      settling = true
      const targetHeight = lastHeight
      host.style.height = `${Math.ceil(targetHeight + 28)}px`
      host.style.overflow = "hidden"

      applyIframeWidth(iframe, ICON_ROW_FIT_PX)
      await sleep(FIT_PROBE_MS)
      if (cancelled) {
        settling = false
        return
      }

      let best = ICON_ROW_FIT_PX
      if (lastHeight > targetHeight + 6) {
        // Tight width wrapped the icons — use JustWatch's floor instead.
        best = JW_WIDTH_FLOOR_PX
        applyIframeWidth(iframe, best)
        applyIframeHeight(iframe, targetHeight)
        await sleep(FIT_PROBE_MS)
        if (cancelled) {
          settling = false
          return
        }
        applyIframeHeight(iframe, lastHeight > 20 ? lastHeight : targetHeight)
      } else {
        applyIframeHeight(iframe, targetHeight)
      }

      fittedWidthRef.current = best
      settling = false
      reveal()
    }

    const scheduleSettle = () => {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        const iframe = getIframe()
        if (iframe) void settleIframeWidth(iframe)
      }, 120)
    }

    const prepareIframe = (iframe: HTMLIFrameElement) => {
      if (iframe.dataset.jwPrepared === "1") {
        lockFittedWidth(iframe)
        return
      }
      iframe.dataset.jwPrepared = "1"
      applyIframeWidth(iframe, JW_WIDTH_FLOOR_PX)
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
          lastHeight = h
          applyIframeHeight(iframe, h)
          if (fittedWidthRef.current == null) scheduleSettle()
        }
      }

      if (event.data.type === "resize-width" && typeof event.data.cssWidth === "string") {
        if (fittedWidthRef.current != null) {
          lockFittedWidth(iframe)
          return
        }
        if (settling) return
        const w = Number.parseFloat(event.data.cssWidth)
        if (Number.isFinite(w) && w > JW_WIDTH_FLOOR_PX) {
          applyIframeWidth(iframe, w)
          fittedWidthRef.current = Math.round(w)
          reveal()
        } else if (Number.isFinite(w) && w > 0) {
          applyIframeWidth(iframe, JW_WIDTH_FLOOR_PX)
        }
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
        if (iframe) applyIframeWidth(iframe, JW_WIDTH_FLOOR_PX)
        fittedWidthRef.current = JW_WIDTH_FLOOR_PX
      }
      reveal()
    }, REVEAL_FALLBACK_MS)

    return () => {
      cancelled = true
      window.clearTimeout(settleTimer)
      window.clearTimeout(fallbackTimer)
      window.clearInterval(lockInterval)
      obs.disconnect()
      window.removeEventListener("message", onMessage)
      fittedWidthRef.current = null
    }
  }, [titleValue, yearValue, hostId])

  if (!titleValue || !yearValue) return null

  return (
    <div
      id={hostId}
      className="jw-widget-host mx-auto mb-6 mt-1 flex w-full max-w-2xl flex-col items-center sm:mb-8"
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
    </div>
  )
}
