"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Flag } from "lucide-react"
import { useSession } from "@/components/providers/SessionProvider"
import { REPORT_REASONS, type ReportReason } from "@/lib/validation/ratingComment"

export type PublicReview = {
  id: string
  comment: string
  isSpoiler: boolean
  score: number
  createdAt: string
  userId: string | null
  username: string | null
  displayName: string
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function ReviewCard({
  review,
  currentUserId,
}: {
  review: PublicReview
  currentUserId?: string | null
}) {
  const [revealed, setRevealed] = useState(!review.isSpoiler)
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>("spam")
  const [details, setDetails] = useState("")
  const [reportStatus, setReportStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [reportError, setReportError] = useState("")

  const canReport =
    Boolean(currentUserId) && currentUserId !== review.userId && reportStatus !== "done"

  const submitReport = async () => {
    setReportStatus("sending")
    setReportError("")
    try {
      const res = await fetch("/api/ratings/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ratingId: review.id,
          reason,
          details: details.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setReportStatus("error")
        setReportError(data.error || "Could not submit report")
        return
      }
      setReportStatus("done")
      setReportOpen(false)
    } catch {
      setReportStatus("error")
      setReportError("Could not submit report")
    }
  }

  const profileHref = review.username ? `/u/${review.username}` : undefined

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {profileHref ? (
            <Link href={profileHref} className="text-sm font-semibold text-[#FFD700] hover:underline">
              {review.displayName}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-white/90">{review.displayName}</span>
          )}
          <div className="text-xs text-zinc-500 mt-0.5">
            {review.score.toFixed(1)}/10 · {relativeTime(review.createdAt)}
            {review.isSpoiler ? " · Spoiler" : ""}
          </div>
        </div>
        {canReport ? (
          <button
            type="button"
            onClick={() => setReportOpen((o) => !o)}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
            aria-label="Report review"
          >
            <Flag className="w-3.5 h-3.5" />
            Report
          </button>
        ) : null}
        {reportStatus === "done" ? (
          <span className="text-[11px] text-emerald-400/80">Reported</span>
        ) : null}
      </div>

      {review.isSpoiler && !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-6 text-sm text-zinc-400 hover:border-[#FFD700]/30 hover:text-white transition-colors"
        >
          Show spoiler
        </button>
      ) : (
        <p
          className={`text-sm leading-relaxed text-zinc-300 ${
            review.isSpoiler && !revealed ? "blur-sm select-none" : ""
          }`}
        >
          {review.comment}
        </p>
      )}

      {reportOpen ? (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/50 p-3 space-y-2">
          <p className="text-xs text-zinc-400">Why are you reporting this?</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            className="w-full rounded-md border border-white/10 bg-[#0a0a0a] px-2 py-2 text-sm text-white"
          >
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="Optional details"
            className="w-full rounded-md border border-white/10 bg-[#0a0a0a] px-2 py-2 text-sm text-white placeholder:text-zinc-600"
          />
          {reportError ? <p className="text-xs text-red-400">{reportError}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={reportStatus === "sending"}
              onClick={() => void submitReport()}
              className="flex-1 rounded-md bg-[#FFD700] px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {reportStatus === "sending" ? "Sending…" : "Submit report"}
            </button>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

type Props = {
  actorId: string
  movieId: string
  /** Bump to refetch after the current user posts a review */
  refreshKey?: number | string
}

export function PerformanceReviewsSection({ actorId, movieId, refreshKey = 0 }: Props) {
  const { user } = useSession()
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/ratings/reviews?actorId=${encodeURIComponent(actorId)}&movieId=${encodeURIComponent(movieId)}&limit=20`,
      )
      if (!res.ok) {
        setReviews([])
        return
      }
      const data = (await res.json()) as { reviews?: PublicReview[] }
      setReviews(data.reviews ?? [])
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [actorId, movieId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  if (loading && reviews.length === 0) {
    return (
      <section className="mt-6 max-w-[600px] mx-auto">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Community reviews
        </h3>
        <p className="text-sm text-zinc-600">Loading reviews…</p>
      </section>
    )
  }

  if (reviews.length === 0) {
    return (
      <section className="mt-6 max-w-[600px] mx-auto">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Community reviews
        </h3>
        <p className="text-sm text-zinc-600">
          No reviews yet — be the first to explain your score.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-6 max-w-[600px] mx-auto space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
        Community reviews
      </h3>
      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} currentUserId={user?.id} />
        ))}
      </div>
    </section>
  )
}
