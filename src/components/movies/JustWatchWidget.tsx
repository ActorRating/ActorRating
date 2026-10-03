"use client"

import Script from "next/script"
import { useEffect, useId } from "react"

const SCRIPT_SRC = "https://widget.justwatch.com/justwatch_widget.js"
const SCRIPT_ID = "justwatch-widget"

/** Public widget key. Override with NEXT_PUBLIC_JUSTWATCH_API_KEY if JustWatch rotates it. */
const JUSTWATCH_API_KEY =
  process.env.NEXT_PUBLIC_JUSTWATCH_API_KEY?.trim() || "8pCc7emwtOajDUs6bvhgtYWjb8LIa7Ct"

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

/**
 * JustWatch sets the iframe to width 100%, which left-aligns the icon row.
 * Shrink to content width when possible and center the frame on the page.
 */
function centerJustWatchIframes(root: HTMLElement | null) {
  if (!root) return
  root.querySelectorAll<HTMLIFrameElement>("iframe.jw-widget-iframe").forEach((iframe) => {
    iframe.style.display = "block"
    iframe.style.marginLeft = "auto"
    iframe.style.marginRight = "auto"
    iframe.style.maxWidth = "100%"
    const reported = iframe.getAttribute("width")
    if (reported && reported !== "100%" && /^\d+$/.test(reported)) {
      iframe.style.width = `${reported}px`
    } else {
      iframe.style.width = "fit-content"
    }
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

  useEffect(() => {
    if (!titleValue || !yearValue) return
    reloadJustWatchWidgets()

    const host = document.getElementById(hostId)
    centerJustWatchIframes(host)

    const obs = new MutationObserver(() => centerJustWatchIframes(host))
    if (host) obs.observe(host, { childList: true, subtree: true, attributes: true })

    const onMessage = (event: MessageEvent) => {
      if (!event.data || event.data.sender !== "jw_widget") return
      // Width/height updates land as attributes; re-center after they apply.
      requestAnimationFrame(() => centerJustWatchIframes(host))
    }
    window.addEventListener("message", onMessage)

    return () => {
      obs.disconnect()
      window.removeEventListener("message", onMessage)
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
        className="w-full"
      />
      <a
        href="https://www.justwatch.com/us/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
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
          centerJustWatchIframes(document.getElementById(hostId))
        }}
      />
    </div>
  )
}
