"use client"

import Script from "next/script"
import { useEffect } from "react"

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
  const titleValue = title.trim()
  const yearValue = year != null && year > 0 ? String(year) : ""

  useEffect(() => {
    if (!titleValue || !yearValue) return
    reloadJustWatchWidgets()
  }, [titleValue, yearValue])

  if (!titleValue || !yearValue) return null

  return (
    <div className="mx-auto mb-6 w-full max-w-2xl sm:mb-8">
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
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "0.35rem",
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
        onLoad={reloadJustWatchWidgets}
      />
    </div>
  )
}
