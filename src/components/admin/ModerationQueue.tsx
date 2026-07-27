"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

type ReviewReport = {
  kind: "review"
  id: string
  reason: string
  details: string | null
  status: string
  createdAt: string
  rating: {
    id: string
    comment: string | null
    isSpoiler: boolean
    commentHidden: boolean
    weightedScore: number
    actor: { name: string }
    movie: { title: string; year: number }
    user: { username: string | null; email: string } | null
  }
  reporter: { username: string | null; email: string }
}

type ForumReport = {
  kind: "forum"
  id: string
  reason: string
  details: string | null
  status: string
  createdAt: string
  post: {
    id: string
    content: string
    isSpoiler: boolean
    isHidden: boolean
    thread: { title: string; slug: string }
    author: { username: string | null; email: string }
  }
  reporter: { username: string | null; email: string }
}

type ModerationReport = ReviewReport | ForumReport

export default function ModerationQueue() {
  const [reports, setReports] = useState<ModerationReport[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/moderation?status=OPEN")
      if (!res.ok) {
        setError("Failed to load moderation queue")
        setReports([])
        return
      }
      const data = (await res.json()) as { reports?: ModerationReport[] }
      setReports(data.reports ?? [])
    } catch {
      setError("Failed to load moderation queue")
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (report: ModerationReport, action: "dismiss" | "hide") => {
    setBusyId(report.id)
    setError("")
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, kind: report.kind, action }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error || "Action failed")
        return
      }
      setReports((prev) => prev.filter((r) => r.id !== report.id))
    } catch {
      setError("Action failed")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Moderation queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open reports on micro-reviews and forum posts. Hide removes the content from public
            views.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-3 py-3 font-medium">Content</th>
              <th className="border-b border-border px-3 py-3 font-medium">Reason</th>
              <th className="border-b border-border px-3 py-3 font-medium">Reporter</th>
              <th className="border-b border-border px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-sm text-muted-foreground">
                  No open reports.
                </td>
              </tr>
            ) : (
              reports.map((row) => {
                const alreadyHidden =
                  row.kind === "review" ? row.rating.commentHidden : row.post.isHidden
                return (
                  <tr key={`${row.kind}-${row.id}`} className="text-sm text-foreground/95 align-top">
                    <td className="border-b border-border/60 px-3 py-3">
                      {row.kind === "review" ? (
                        <>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                            Review
                          </div>
                          <div className="font-medium">
                            {row.rating.actor.name} · {row.rating.movie.title} (
                            {row.rating.movie.year})
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            by{" "}
                            {row.rating.user?.username
                              ? `@${row.rating.user.username}`
                              : row.rating.user?.email ?? "unknown"}
                            {row.rating.isSpoiler ? " · spoiler" : ""}
                            {row.rating.commentHidden ? " · already hidden" : ""}
                          </div>
                          <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">
                            {row.rating.comment || "(empty)"}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                            Forum
                          </div>
                          <div className="font-medium">
                            <Link
                              href={`/forum/t/${row.post.thread.slug}`}
                              className="hover:underline"
                            >
                              {row.post.thread.title}
                            </Link>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            by{" "}
                            {row.post.author.username
                              ? `@${row.post.author.username}`
                              : row.post.author.email}
                            {row.post.isSpoiler ? " · spoiler" : ""}
                            {row.post.isHidden ? " · already hidden" : ""}
                          </div>
                          <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">
                            {row.post.content}
                          </p>
                        </>
                      )}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3">
                      <div className="font-medium capitalize">{row.reason}</div>
                      {row.details ? (
                        <div className="mt-1 text-xs text-muted-foreground">{row.details}</div>
                      ) : null}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                      {row.reporter.username ? `@${row.reporter.username}` : row.reporter.email}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3">
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyId === row.id}
                          onClick={() => void act(row, "dismiss")}
                        >
                          Dismiss
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === row.id || alreadyHidden}
                          onClick={() => void act(row, "hide")}
                        >
                          Hide
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
