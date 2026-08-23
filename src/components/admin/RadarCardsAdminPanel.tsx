"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type {
  PerformanceRatingOption,
  RadarCardPayload,
  RatedPerformanceSearchItem,
} from "@/lib/admin/radar-card-data"

const REQUEST_TIMEOUT_MS = 35_000

type CardSize = "square" | "og"

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function readError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({} as { error?: string }))
  if (typeof data.error === "string" && data.error) return data.error
  return `Request failed (${res.status})`
}

function slugify(name: string | null | undefined): string {
  return (name || "performance")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function svgToPngBlob(svgText: string, width: number, height: number): Promise<Blob | null> {
  const blob = new Blob([svgText], { type: "image/svg+xml" })
  const svgObjectUrl = URL.createObjectURL(blob)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(svgObjectUrl)
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(svgObjectUrl)
      canvas.toBlob((pngBlob) => resolve(pngBlob), "image/png")
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgObjectUrl)
      resolve(null)
    }
    img.src = svgObjectUrl
  })
}

export default function RadarCardsAdminPanel() {
  const [q, setQ] = useState("")
  const [items, setItems] = useState<RatedPerformanceSearchItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [selected, setSelected] = useState<RatedPerformanceSearchItem | null>(null)
  const [payload, setPayload] = useState<RadarCardPayload | null>(null)
  const [ratings, setRatings] = useState<PerformanceRatingOption[]>([])
  const [source, setSource] = useState<"community" | string>("community")
  const [size, setSize] = useState<CardSize>("square")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      params.set("limit", "100")
      const res = await fetchWithTimeout(`/api/admin/radar-cards/search?${params.toString()}`)
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }, [q])

  const loadPreview = useCallback(
    async (item: RatedPerformanceSearchItem, ratingId: string | null) => {
      setPreviewLoading(true)
      setMessage(null)
      try {
        const params = new URLSearchParams({
          actorId: item.actorId,
          movieId: item.movieId,
        })
        if (ratingId) params.set("ratingId", ratingId)
        const res = await fetchWithTimeout(`/api/admin/radar-cards/preview?${params.toString()}`)
        if (!res.ok) throw new Error(await readError(res))
        const data = await res.json()
        setPayload(data.payload ?? null)
        setRatings(data.ratings ?? [])
      } catch (err) {
        setPayload(null)
        setRatings([])
        setMessage(err instanceof Error ? err.message : "Preview failed")
      } finally {
        setPreviewLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadList()
  }, [loadList])

  const handleSelect = (item: RatedPerformanceSearchItem) => {
    setSelected(item)
    setSource("community")
    void loadPreview(item, null)
  }

  const handleSourceChange = (value: string) => {
    setSource(value)
    if (!selected) return
    const ratingId = value === "community" ? null : value
    void loadPreview(selected, ratingId)
  }

  const imageUrl = useMemo(() => {
    if (!selected || !payload) return null
    const params = new URLSearchParams({
      actorId: selected.actorId,
      movieId: selected.movieId,
      size,
    })
    if (source !== "community") params.set("ratingId", source)
    return `/api/admin/radar-cards/image?${params.toString()}`
  }, [selected, payload, size, source])

  const downloadSvg = async () => {
    if (!imageUrl || !selected) return
    setDownloading(true)
    try {
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error(await readError(res))
      const svgText = await res.text()
      const base = `${slugify(selected.actorSlug || selected.actorName)}-${slugify(selected.movieSlug || selected.movieTitle)}`
      await downloadBlob(new Blob([svgText], { type: "image/svg+xml" }), `${base}-radar.svg`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "SVG download failed")
    } finally {
      setDownloading(false)
    }
  }

  const downloadPng = async () => {
    if (!imageUrl || !selected) return
    setDownloading(true)
    try {
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error(await readError(res))
      const svgText = await res.text()
      const pngWidth = size === "square" ? 1080 : 1200
      const pngHeight = size === "square" ? 1080 : 630
      const pngBlob = await svgToPngBlob(svgText, pngWidth, pngHeight)
      if (!pngBlob) throw new Error("PNG conversion failed")
      const base = `${slugify(selected.actorSlug || selected.actorName)}-${slugify(selected.movieSlug || selected.movieTitle)}`
      await downloadBlob(pngBlob, `${base}-radar.png`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "PNG download failed")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Search actor or movie
            </span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void loadList()
              }}
              placeholder="e.g. Florence Pugh, Midsommar"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadList()}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} performances with logged-in user ratings
          {q.trim() ? ` matching “${q.trim()}”` : ""}.
        </p>

        {message ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        ) : null}

        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-secondary/80 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Movie</th>
                <th className="px-3 py-2">Ratings</th>
                <th className="px-3 py-2">Avg</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const active =
                  selected?.actorId === item.actorId && selected?.movieId === item.movieId
                return (
                  <tr
                    key={`${item.actorId}-${item.movieId}`}
                    className={`cursor-pointer border-t border-border/60 ${active ? "bg-primary/10" : "hover:bg-secondary/40"}`}
                    onClick={() => handleSelect(item)}
                  >
                    <td className="px-3 py-2 font-medium">{item.actorName}</td>
                    <td className="px-3 py-2">
                      {item.movieTitle} ({item.movieYear})
                    </td>
                    <td className="px-3 py-2">{item.ratingCount}</td>
                    <td className="px-3 py-2">
                      {item.avgScore10 != null ? `${item.avgScore10}/10` : "—"}
                    </td>
                  </tr>
                )
              })}
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    No rated performances found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Radar card preview</h2>
          <p className="text-sm text-muted-foreground">
            Select a performance, choose community average or a specific rating, then download.
          </p>
        </header>

        {!selected ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
            Pick a performance from the list to generate a radar card.
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm">
              <p className="font-medium text-foreground">
                {selected.actorName} in {selected.movieTitle} ({selected.movieYear})
              </p>
              <p className="mt-1 text-muted-foreground">
                {selected.ratingCount} logged-in rating{selected.ratingCount === 1 ? "" : "s"}
              </p>
              {selected.actorSlug && selected.movieSlug ? (
                <Link
                  href={`/rate/${selected.actorSlug}/${selected.movieSlug}`}
                  className="mt-2 inline-block text-[#FFD700] hover:underline"
                  target="_blank"
                >
                  Open rate page →
                </Link>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Data source
                </span>
                <select
                  value={source}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  disabled={previewLoading}
                  className="min-w-[220px] rounded-md border border-border bg-background px-3 py-2"
                >
                  <option value="community">Community average</option>
                  {ratings.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.username} — {r.score10}/10
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Size
                </span>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as CardSize)}
                  className="rounded-md border border-border bg-background px-3 py-2"
                >
                  <option value="square">Square (1080×1080)</option>
                  <option value="og">OG (1200×630)</option>
                </select>
              </label>
            </div>

            {payload ? (
              <div className="rounded-lg border border-border bg-black/40 p-3 text-sm text-muted-foreground">
                Score: <span className="font-medium text-foreground">{payload.scoreOutOf10}/10</span>
                {" · "}
                Source:{" "}
                <span className="font-medium text-foreground">
                  {payload.source === "community" ? "Community average" : payload.username}
                </span>
              </div>
            ) : null}

            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-border bg-black/60 p-4">
              {previewLoading ? (
                <p className="text-sm text-muted-foreground">Loading preview…</p>
              ) : imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={`Radar card for ${selected.actorName} in ${selected.movieTitle}`}
                  className="max-h-[480px] w-full max-w-[480px] object-contain"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No preview available.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void downloadPng()}
                disabled={!imageUrl || downloading || previewLoading}
                className="rounded-md bg-[#FFD700] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                {downloading ? "Preparing…" : "Download PNG"}
              </button>
              <button
                type="button"
                onClick={() => void downloadSvg()}
                disabled={!imageUrl || downloading || previewLoading}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                Download SVG
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
