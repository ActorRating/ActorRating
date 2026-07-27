"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Flag } from "lucide-react"
import { useSession } from "@/components/providers/SessionProvider"
import { FORUM_POST_MAX_LENGTH } from "@/lib/forum/validation"
import { REPORT_REASONS, type ReportReason } from "@/lib/validation/ratingComment"

export type ForumPostView = {
  id: string
  content: string
  isSpoiler: boolean
  isOriginal: boolean
  createdAt: string
  authorId: string
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

function PostCard({
  post,
  currentUserId,
}: {
  post: ForumPostView
  currentUserId?: string | null
}) {
  const [revealed, setRevealed] = useState(!post.isSpoiler)
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>("spam")
  const [details, setDetails] = useState("")
  const [reportStatus, setReportStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [reportError, setReportError] = useState("")

  const canReport =
    Boolean(currentUserId) && currentUserId !== post.authorId && reportStatus !== "done"
  const profileHref = post.username ? `/u/${post.username}` : undefined

  const submitReport = async () => {
    setReportStatus("sending")
    setReportError("")
    try {
      const res = await fetch("/api/forum/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
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

  return (
    <article className="border-b border-white/[0.07] py-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          {profileHref ? (
            <Link href={profileHref} className="text-sm font-semibold text-[#FFD700] hover:underline">
              {post.displayName}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-white/90">{post.displayName}</span>
          )}
          <div className="text-xs text-zinc-500 mt-0.5">
            {relativeTime(post.createdAt)}
            {post.isOriginal ? " · OP" : ""}
            {post.isSpoiler ? " · Spoiler" : ""}
          </div>
        </div>
        {canReport ? (
          <button
            type="button"
            onClick={() => setReportOpen((o) => !o)}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
            aria-label="Report post"
          >
            <Flag className="h-3 w-3" />
            Report
          </button>
        ) : null}
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="text-sm text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
        >
          Reveal spoiler
        </button>
      ) : (
        <p className="text-sm sm:text-[15px] leading-relaxed text-zinc-200 whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {reportOpen ? (
        <div className="mt-4 rounded-sm border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            className="w-full rounded-sm border border-white/15 bg-zinc-950 px-2 py-1.5 text-xs text-white"
          >
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional details"
            className="w-full rounded-sm border border-white/15 bg-zinc-950 px-2 py-1.5 text-xs text-white"
          />
          {reportError ? <p className="text-xs text-red-400">{reportError}</p> : null}
          <button
            type="button"
            disabled={reportStatus === "sending"}
            onClick={() => void submitReport()}
            className="text-xs font-bold uppercase tracking-wide text-[#FFD700]"
          >
            {reportStatus === "sending" ? "Sending…" : "Submit report"}
          </button>
        </div>
      ) : null}
    </article>
  )
}

export function ForumThreadClient({
  slug,
  initialPosts,
  isLocked,
}: {
  slug: string
  initialPosts: ForumPostView[]
  isLocked: boolean
}) {
  const { user } = useSession()
  const [posts, setPosts] = useState(initialPosts)
  const [content, setContent] = useState("")
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const onReply = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch(`/api/forum/threads/${encodeURIComponent(slug)}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, isSpoiler }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        post?: ForumPostView
      }
      if (!res.ok || !data.post) {
        setError(data.error || "Could not post reply")
        return
      }
      setPosts((prev) => [...prev, data.post!])
      setContent("")
      setIsSpoiler(false)
    } catch {
      setError("Could not post reply")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div>
        {posts.map((p) => (
          <PostCard key={p.id} post={p} currentUserId={user?.id} />
        ))}
      </div>

      <div className="pt-8">
        {isLocked ? (
          <p className="text-sm text-zinc-500">This thread is locked.</p>
        ) : !user ? (
          <p className="text-sm text-zinc-500">
            <Link href={`/auth/signin?callbackUrl=/forum/t/${slug}`} className="text-[#FFD700] hover:underline">
              Sign in
            </Link>{" "}
            to reply.
          </p>
        ) : (
          <form onSubmit={onReply} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Your reply
              </span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={FORUM_POST_MAX_LENGTH}
                rows={5}
                className="w-full rounded-sm border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm text-white resize-y"
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
              />
              Contains spoilers
            </label>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, #FFD700, #FFA500)" }}
            >
              {submitting ? "Posting…" : "Post reply"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
