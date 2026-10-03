"use client"

import Script from "next/script"
import { useEffect, useId, useRef } from "react"

const SCRIPT_SRC = "https://widget.justwatch.com/justwatch_widget.js"
const SCRIPT_ID = "justwatch-widget"

/** Public widget key. Override with NEXT_PUBLIC_JUSTWATCH_API_KEY if JustWatch rotates it. */
const JUSTWATCH_API_KEY =
  process.env.NEXT_PUBLIC_JUSTWATCH_API_KEY?.trim() || "8pCc7emwtOajDUs6bvhgtYWjb8LIa7Ct"

/**
 * JustWatch's resize script posts width = max(body.scrollWidth, 300), so a full-bleed
 * iframe always reports full-bleed. Their floor is 300 even when the icon row is ~230px,
 * which leaves empty space on the right and makes a "centered" frame look left-heavy.
 */
const JW_WIDTH_FLOOR_PX = 300
const FIT_MIN_PX = 170
const FIT_PROBE_MS = 220

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
    let fitting = false
    let fitTimer: number | undefined
    let cancelled = false

    const getIframe = () => host.querySelector<HTMLIFrameElement>("iframe.jw-widget-iframe")

    const lockFittedWidth = (iframe: HTMLIFrameElement) => {
      const fitted = fittedWidthRef.current
      if (fitted == null) return
      if (Math.abs(iframe.offsetWidth - fitted) > 1) {
        applyIframeWidth(iframe, fitted)
      }
    }

    /**
     * Shrink from JustWatch's 300px floor until height grows (icons wrapped).
     * That finds the true icon-row width so margin:auto / flex centering lines
     * up with the Rate button.
     */
    const fitIframeToIconRow = async (iframe: HTMLIFrameElement) => {
      if (cancelled || fitting || fittedWidthRef.current != null) return
      if (lastHeight < 20) return

      fitting = true
      const targetHeight = lastHeight

      applyIframeWidth(iframe, JW_WIDTH_FLOOR_PX)
      await sleep(FIT_PROBE_MS)
      if (cancelled) {
        fitting = false
        return
      }

      let lo = FIT_MIN_PX
      let hi = JW_WIDTH_FLOOR_PX
      let best = JW_WIDTH_FLOOR_PX

      for (let i = 0; i < 8; i += 1) {
        const mid = Math.round((lo + hi) / 2)
        applyIframeWidth(iframe, mid)
        await sleep(FIT_PROBE_MS)
        if (cancelled) {
          fitting = false
          return
        }

        // Height updates arrive via postMessage into lastHeight.
        if (lastHeight > targetHeight + 6) {
          // Wrapped onto another row — too narrow.
          lo = mid + 1
          lastHeight = targetHeight
          applyIframeHeight(iframe, targetHeight)
        } else {
          best = mid
          hi = mid - 1
        }
      }

      applyIframeWidth(iframe, best)
      fittedWidthRef.current = best
      fitting = false
    }

    const scheduleFit = () => {
      window.clearTimeout(fitTimer)
      fitTimer = window.setTimeout(() => {
        const iframe = getIframe()
        if (iframe) void fitIframeToIconRow(iframe)
      }, 350)
    }

    const prepareIframe = (iframe: HTMLIFrameElement) => {
      if (iframe.dataset.jwPrepared === "1") {
        lockFittedWidth(iframe)
        return
      }
      iframe.dataset.jwPrepared = "1"
      // Narrower than the page so their scrollWidth isn't full-bleed.
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
          if (fittedWidthRef.current == null) scheduleFit()
        }
      }

      if (event.data.type === "resize-width" && typeof event.data.cssWidth === "string") {
        // Their script also applies this; re-assert our fitted width when we have one.
        if (fittedWidthRef.current != null) {
          lockFittedWidth(iframe)
          return
        }
        if (fitting) return
        const w = Number.parseFloat(event.data.cssWidth)
        if (Number.isFinite(w) && w > JW_WIDTH_FLOOR_PX) {
          // Genuine wide content (many offers) — trust it.
          applyIframeWidth(iframe, w)
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

    return () => {
      cancelled = true
      window.clearTimeout(fitTimer)
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
