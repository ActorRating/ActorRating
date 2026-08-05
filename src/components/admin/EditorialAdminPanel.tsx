"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

type ListItem = {
  id: string
  status: string
  wordCount: number
  model: string | null
  updatedAt: string
  actor: { id: string; name: string; slug: string | null }
  movie: { id: string; title: string; year: number; slug: string | null }
}

type Detail = ListItem & {
  overview: string
  scoreAnalysis: string
  communityTake: string
  notableMoments: string
  spoilerFree: boolean
  promptVersion: string
  publishedAt: string | null
  editedByEmail: string | null
}

type QueueItem = {
  actorId: string
  movieId: string
  actorName: string
  movieTitle: string
  movieYear: number
  ratingCount: number
  reason: string
}

const STATUSES = ["", "DRAFT", "PUBLISHED", "HUMAN_LOCKED", "NEEDS_REGEN"] as const

async function readError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({} as { error?: string }))
  if (typeof data.error === "string" && data.error) return data.error
  return `Request failed (${res.status})`
}

export default function EditorialAdminPanel() {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [items, setItems] = useState<ListItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      if (status) params.set("status", status)
      const res = await fetch(`/api/admin/editorial?${params.toString()}`)
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      setItems(data.items ?? [])
      setCounts(data.counts ?? {})
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Load failed")
    } finally {
      setLoading(false)
    }
  }, [q, status])

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/editorial/queue?limit=15&minRatings=0")
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      setQueue(data.items ?? [])
    } catch (err) {
      setQueue([])
      setMessage(err instanceof Error ? err.message : "Queue load failed")
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/editorial/${id}`)
      if (!res.ok) throw new Error(await readError(res))
      setDetail(await res.json())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Load failed")
      setDetail(null)
    }
  }, [])

  useEffect(() => {
    void loadList()
    void loadQueue()
  }, [loadList, loadQueue])

  async function save(patch: Partial<Detail> & { status?: string }) {
    if (!detail) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/editorial/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(await readError(res))
      const updated = await res.json()
      setDetail(updated)
      setMessage("Saved")
      void loadList()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function regenerate(force = false) {
    if (!detail) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/editorial/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detail.id, force }),
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      setDetail(data.editorial)
      setMessage(force ? "Regenerated (forced)" : "Regenerated")
      void loadList()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Generate failed")
    } finally {
      setSaving(false)
    }
  }

  /** One-by-one generation — avoids proxy timeouts from a single long batch request. */
  async function runSequential(limit = 10) {
    setSaving(true)
    setMessage(null)
    setProgress(null)
    let ok = 0
    let fail = 0
    const failures: string[] = []

    try {
      const res = await fetch(`/api/admin/editorial/queue?limit=${limit}&minRatings=0`)
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      const targets: QueueItem[] = data.items ?? []
      setQueue(targets)

      if (targets.length === 0) {
        setMessage("Queue empty — nothing to generate (or migrate hasn’t been applied).")
        return
      }

      for (let i = 0; i < targets.length; i++) {
        const item = targets[i]
        setProgress(`${i + 1}/${targets.length}: ${item.actorName} — ${item.movieTitle}`)
        try {
          const gen = await fetch("/api/admin/editorial/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actorId: item.actorId, movieId: item.movieId }),
          })
          if (!gen.ok) {
            const errText = await readError(gen)
            // Brief pause + one retry on pool exhaustion.
            if (/connection pool|Timed out fetching/i.test(errText)) {
              await new Promise((r) => setTimeout(r, 1500))
              const retry = await fetch("/api/admin/editorial/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actorId: item.actorId, movieId: item.movieId }),
              })
              if (!retry.ok) {
                fail += 1
                failures.push(`${item.actorName}: ${await readError(retry)}`)
              } else {
                ok += 1
              }
            } else {
              fail += 1
              failures.push(`${item.actorName}: ${errText}`)
            }
          } else {
            ok += 1
          }
        } catch (err) {
          fail += 1
          failures.push(
            `${item.actorName}: ${err instanceof Error ? err.message : "network error"}`,
          )
        }
        // Let the Prisma pool drain between pages (Coolify uses a small pool).
        await new Promise((r) => setTimeout(r, 250))
      }

      const failureNote = failures.length ? ` · ${failures.slice(0, 3).join(" | ")}` : ""
      setMessage(`Generated ${ok} ok, ${fail} failed (${targets.length} queued)${failureNote}`)
      void loadList()
      void loadQueue()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Batch failed")
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  const rateHref =
    detail?.movie.slug && detail?.actor.slug
      ? `/rate/${detail.movie.slug}/${detail.actor.slug}`
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Search actor / movie</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="bale, dark-knight…"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "All"}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            void loadList()
            void loadQueue()
          }}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void runSequential(10)}
          className="rounded-lg border border-[#FFD700]/40 px-3 py-2 text-sm text-[#FFD700] disabled:opacity-50"
        >
          Generate next 10
        </button>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Queue preview ({queue.length})</p>
        {queue.length === 0 ? (
          <p className="mt-1">No pending indexable performances (or table not migrated yet).</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {queue.slice(0, 8).map((item) => (
              <li key={`${item.actorId}:${item.movieId}`}>
                {item.actorName} — {item.movieTitle} ({item.movieYear}) · {item.ratingCount} ratings ·{" "}
                {item.reason}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(counts).map(([k, v]) => (
          <span key={k} className="rounded-full border border-border px-2 py-1">
            {k}: {v}
          </span>
        ))}
      </div>

      {progress ? <p className="text-sm text-muted-foreground">{progress}</p> : null}
      {message ? <p className="text-sm text-[#FFD700]">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Editorials {loading ? "…" : ""}</h2>
          <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void loadDetail(item.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selectedId === item.id
                      ? "border-[#FFD700]/60 bg-secondary"
                      : "border-border bg-secondary/40 hover:border-border/80"
                  }`}
                >
                  <span className="font-medium text-foreground">
                    {item.actor.name} — {item.movie.title} ({item.movie.year})
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.status} · {item.wordCount}w
                  </span>
                </button>
              </li>
            ))}
            {items.length === 0 && !loading ? (
              <li className="text-sm text-muted-foreground">No editorials yet — run Generate next 10.</li>
            ) : null}
          </ul>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
          {!detail ? (
            <p className="text-sm text-muted-foreground">Select an editorial to edit.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-foreground">
                    {detail.actor.name} in {detail.movie.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {detail.status} · {detail.wordCount}w · {detail.promptVersion}
                    {detail.model ? ` · ${detail.model}` : ""}
                  </p>
                </div>
                {rateHref ? (
                  <Link href={rateHref} className="text-xs text-[#FFD700] hover:underline" target="_blank">
                    Open rate page
                  </Link>
                ) : null}
              </div>

              {(
                [
                  ["overview", "Overview"],
                  ["scoreAnalysis", "Score analysis"],
                  ["communityTake", "Community take"],
                  ["notableMoments", "Notable moments"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">{label}</span>
                  <textarea
                    value={detail[key]}
                    onChange={(e) => setDetail({ ...detail, [key]: e.target.value })}
                    rows={key === "overview" ? 5 : 4}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              ))}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void save({
                      overview: detail.overview,
                      scoreAnalysis: detail.scoreAnalysis,
                      communityTake: detail.communityTake,
                      notableMoments: detail.notableMoments,
                    })
                  }
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Save copy
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save({ status: "PUBLISHED" })}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  Publish
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save({ status: "DRAFT" })}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  Unpublish
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save({ status: "HUMAN_LOCKED" })}
                  className="rounded-lg border border-[#FFD700]/40 px-3 py-2 text-sm text-[#FFD700]"
                >
                  Lock (human)
                </button>
                <button
                  type="button"
                  disabled={saving || detail.status === "HUMAN_LOCKED"}
                  onClick={() => void regenerate(false)}
                  className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
                >
                  Regenerate
                </button>
                {detail.status === "HUMAN_LOCKED" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void regenerate(true)}
                    className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300"
                  >
                    Force regenerate
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
