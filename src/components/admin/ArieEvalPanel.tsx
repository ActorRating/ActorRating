"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type CoverageSlots = {
  actor: boolean
  movie: boolean
  director: boolean
  radar: boolean
  comparisons: boolean
  awards: boolean
  community: boolean
}

type Preview = {
  id: string
  sourceText: string
  authorHandle: string | null
  inReplyToTweetId?: string | null
  opportunityScore: number
  coveragePercent: number
  coverage: { slots: CoverageSlots; present: number; total: number; percent: number }
  draftText: string
  confidence: number | null
  promptVersion: string
  model: string
  generationMs: number | null
  humanGrade: "A" | "B" | "C" | "D" | null
  scoreRelevance: number | null
  scoreInsight: number | null
  scoreAccuracy: number | null
  scoreBrandVoice: number | null
  notes: string | null
  publishStatus?: string | null
  publishMode?: string | null
  publishedTweetId?: string | null
  publishedAt?: string | null
  publishError?: string | null
}

type QueueStats = {
  pending: number
  inProgress?: number
  done: number
  error: number
  total: number
}

const SLOT_LABELS: Array<[keyof CoverageSlots, string]> = [
  ["actor", "Actor"],
  ["movie", "Movie"],
  ["director", "Director"],
  ["radar", "Radar"],
  ["comparisons", "Comparisons"],
  ["awards", "Awards"],
  ["community", "Community"],
]

const GRADES = ["A", "B", "C", "D"] as const
const SUBS = [
  ["relevance", "Relevance", "Did it address the tweet?"],
  ["insight", "Insight", "Did ActorRating add something unique?"],
  ["accuracy", "Accuracy", "Were the facts correct?"],
  ["brandVoice", "Brand voice", "Did it sound like ActorRating?"],
] as const

type SubKey = (typeof SUBS)[number][0]

/** Client abort so buttons never stay disabled if the server hangs. */
const NEXT_CLIENT_TIMEOUT_MS = 95_000

const BULK_PLACEHOLDER = `@boinkbuzz
1850000000000000000
Paste a real casting/news tweet + optional tweet id/URL on the line under @handle.

---
@chaoscrave_
https://x.com/chaoscrave_/status/1850000000000000001
Paste another tweet.`

export default function ArieEvalPanel() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [ungraded, setUngraded] = useState(0)
  const [total, setTotal] = useState(0)
  const [queue, setQueue] = useState<QueueStats>({ pending: 0, done: 0, error: 0, total: 0 })
  const [bulkText, setBulkText] = useState(BULK_PLACEHOLDER)
  const [notes, setNotes] = useState("")
  const [replyTweetId, setReplyTweetId] = useState("")
  const [editableDraft, setEditableDraft] = useState("")
  const [subsTouched, setSubsTouched] = useState(false)
  const [subs, setSubs] = useState<Record<SubKey, number>>({
    relevance: 3,
    insight: 3,
    accuracy: 3,
    brandVoice: 3,
  })
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyDepth = useRef(0)
  const previewRef = useRef<Preview | null>(null)

  const beginBusy = useCallback(() => {
    busyDepth.current += 1
    setBusy(true)
  }, [])

  const endBusy = useCallback(() => {
    busyDepth.current = Math.max(0, busyDepth.current - 1)
    if (busyDepth.current === 0) setBusy(false)
  }, [])

  const forceIdle = useCallback(() => {
    busyDepth.current = 0
    setBusy(false)
  }, [])

  const applyPreview = useCallback((p: Preview | null) => {
    previewRef.current = p
    setPreview(p)
    setNotes(p?.notes ?? "")
    setReplyTweetId(p?.inReplyToTweetId ?? "")
    setEditableDraft(p?.draftText ?? "")
    setSubsTouched(false)
    setSubs({
      relevance: p?.scoreRelevance ?? 3,
      insight: p?.scoreInsight ?? 3,
      accuracy: p?.scoreAccuracy ?? 3,
      brandVoice: p?.scoreBrandVoice ?? 3,
    })
  }, [])

  const refreshCounts = useCallback(async (opts: { unlock?: boolean } = {}) => {
    const [previewsRes, queueRes] = await Promise.all([
      fetch("/api/admin/arie/previews"),
      fetch(`/api/admin/arie/queue${opts.unlock ? "?unlock=1" : ""}`),
    ])
    if (previewsRes.ok) {
      const data = await previewsRes.json()
      setUngraded(data.ungraded ?? 0)
      setTotal(data.total ?? 0)
      if (!previewRef.current && data.preview) applyPreview(data.preview)
    }
    if (queueRes.ok) {
      const q = await queueRes.json()
      setQueue({
        pending: q.pending ?? 0,
        inProgress: q.inProgress ?? 0,
        done: q.done ?? 0,
        error: q.error ?? 0,
        total: q.total ?? 0,
      })
    }
  }, [applyPreview])

  useEffect(() => {
    void refreshCounts()
  }, [refreshCounts])

  async function importQueue(replace: boolean) {
    beginBusy()
    setMessage(null)
    try {
      const res = await fetch("/api/admin/arie/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bulkText, replace }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Import failed")
      }
      setQueue({
        pending: data.pending ?? 0,
        inProgress: data.inProgress ?? 0,
        done: data.done ?? 0,
        error: data.error ?? 0,
        total: data.total ?? 0,
      })
      setMessage(`Imported ${data.imported} · pending ${data.pending}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed")
    } finally {
      endBusy()
    }
  }

  async function nextFromQueue(opts: { nested?: boolean } = {}) {
    if (!opts.nested) beginBusy()
    setMessage("Generating draft… (Groq can take up to ~1 min)")
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), NEXT_CLIENT_TIMEOUT_MS)
    try {
      const res = await fetch("/api/admin/arie/queue/next", {
        method: "POST",
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.queue) setQueue(data.queue)
        throw new Error(
          typeof data.error === "string"
            ? `${data.error}${data.reason ? `: ${data.reason}` : ""}`
            : `Queue next failed (${res.status})`,
        )
      }
      applyPreview(data.preview)
      if (data.queue) setQueue(data.queue)
      setUngraded((u) => u + 1)
      setTotal((t) => t + 1)
      if (data.publish?.ok) {
        setMessage(`Draft ready · AUTO-POSTED ${data.publish.tweetId}`)
      } else if (data.publish && !data.publish.ok && data.publish.reason !== "auto_publish_disabled" && data.publish.reason !== "publish_disabled" && data.publish.reason !== "missing_tweet_id") {
        setMessage(
          data.kind === "ignored"
            ? "Opportunity ignored — grade if silence was correct"
            : data.kind === "no_reply"
              ? "Model/system chose [NO REPLY]"
              : `Draft ready · auto-publish skipped (${data.publish.reason})`,
        )
      } else {
        setMessage(
          data.kind === "ignored"
            ? "Opportunity ignored — grade if silence was correct"
            : data.kind === "no_reply"
              ? "Model/system chose [NO REPLY]"
              : "Draft ready",
        )
      }
    } catch (err) {
      const aborted =
        (err instanceof Error && err.name === "AbortError") ||
        (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError")
      setMessage(
        aborted
          ? "Timed out waiting for draft — try Next again (server may still finish that item)."
          : err instanceof Error
            ? err.message
            : "Queue next failed",
      )
      try {
        await refreshCounts()
      } catch {
        /* ignore */
      }
    } finally {
      window.clearTimeout(timer)
      if (!opts.nested) endBusy()
    }
  }

  async function publishLive() {
    if (!preview) return
    beginBusy()
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/arie/previews/${preview.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inReplyToTweetId: replyTweetId,
          text: editableDraft,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err =
          typeof data.error === "string" ? data.error : `Publish failed (${res.status})`
        const extra = typeof data.xBody === "string" && data.xBody ? ` | ${data.xBody}` : ""
        throw new Error(`${err}${extra}`.slice(0, 500))
      }
      applyPreview({
        ...preview,
        draftText: editableDraft,
        inReplyToTweetId: replyTweetId,
        publishStatus: "PUBLISHED",
        publishMode: "MANUAL",
        publishedTweetId: data.tweetId,
        publishedAt: new Date().toISOString(),
        publishError: null,
      })
      setMessage(`Posted · ${data.url ?? data.tweetId}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Publish failed")
    } finally {
      endBusy()
    }
  }

  async function saveGrade(
    grade: (typeof GRADES)[number],
    overrideSubs?: Record<SubKey, number>,
  ) {
    if (!preview) return
    const useSubs = overrideSubs ?? subs
    beginBusy()
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/arie/previews/${preview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          humanGrade: grade,
          notes,
          scoreRelevance: useSubs.relevance,
          scoreInsight: useSubs.insight,
          scoreAccuracy: useSubs.accuracy,
          scoreBrandVoice: useSubs.brandVoice,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMessage(`Saved ${grade}${queue.pending ? " — loading next…" : ""}`)
      applyPreview(null)
      setUngraded((u) => Math.max(0, u - 1))
      if (queue.pending > 0) {
        await nextFromQueue({ nested: true })
      } else {
        await refreshCounts()
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed")
    } finally {
      endBusy()
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) {
        return
      }
      if (busy) return

      if (e.key === "n" || e.key === "N") {
        e.preventDefault()
        void nextFromQueue()
        return
      }
      if (!preview) return

      if (e.key === "a" || e.key === "A") {
        e.preventDefault()
        void saveGrade(
          "A",
          e.shiftKey ? { relevance: 5, insight: 5, accuracy: 5, brandVoice: 5 } : undefined,
        )
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault()
        void saveGrade("B")
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        void saveGrade("C")
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault()
        void saveGrade(
          "D",
          e.shiftKey ? { relevance: 1, insight: 1, accuracy: 1, brandVoice: 1 } : undefined,
        )
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, preview, notes, subs, queue.pending])

  const slots = preview?.coverage?.slots
  const silence =
    preview?.draftText === "[NO REPLY]" || preview?.draftText === "[IGNORED BY OPPORTUNITY]"

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-xs text-muted-foreground">
        Ungraded: {ungraded} · Total: {total} · Queue pending: {queue.pending}/{queue.total}
        {queue.inProgress ? ` · in progress: ${queue.inProgress}` : ""}
        {queue.error > 0 ? ` · errors: ${queue.error}` : ""}. Paste a batch once, then{" "}
        <kbd className="rounded border border-border px-1">N</kbd> next ·{" "}
        <kbd className="rounded border border-border px-1">A</kbd>/
        <kbd className="rounded border border-border px-1">B</kbd>/
        <kbd className="rounded border border-border px-1">C</kbd>/
        <kbd className="rounded border border-border px-1">D</kbd> grade ·{" "}
        <kbd className="rounded border border-border px-1">Shift+D</kbd> = D+subs 1 ·{" "}
        <kbd className="rounded border border-border px-1">Shift+A</kbd> = A+subs 5. Click outside
        textareas for hotkeys.
      </p>

      <section className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
        <h2 className="text-sm font-semibold text-foreground">Corpus queue (fast path)</h2>
        <p className="text-xs text-muted-foreground">
          Blocks separated by <code>---</code>. First line = @handle, rest = tweet. Import once, then
          grind with keyboard.
        </p>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void importQueue(false)}
            className="rounded-lg border border-[#FFD700]/40 px-3 py-2 text-sm text-[#FFD700] disabled:opacity-50"
          >
            Add to queue
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void importQueue(true)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground disabled:opacity-50"
          >
            Replace queue
          </button>
          <button
            type="button"
            disabled={busy || queue.pending === 0}
            onClick={() => void nextFromQueue()}
            className="rounded-lg border border-[#FFD700] bg-[#FFD700]/10 px-3 py-2 text-sm font-semibold text-[#FFD700] disabled:opacity-50"
          >
            {busy ? "Working…" : `Next from queue (${queue.pending})`}
          </button>
          {busy || (queue.inProgress ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => {
                forceIdle()
                setMessage("Unlocked UI — reclaimed any stuck in-progress item.")
                void refreshCounts({ unlock: true })
              }}
              className="rounded-lg border border-amber-500/50 px-3 py-2 text-sm text-amber-200"
            >
              Unlock UI
            </button>
          ) : null}
        </div>
      </section>

      {message ? <p className="text-sm text-[#FFD700]">{message}</p> : null}
      {!subsTouched && preview ? (
        <p className="text-xs text-amber-200/80">
          Subs default to 3 — click them or use Shift+A / Shift+D presets before grading if they
          matter.
        </p>
      ) : null}

      {!preview ? (
        <p className="text-sm text-muted-foreground">
          Queue empty or no open preview. Import tweets, then press N / Next from queue.
        </p>
      ) : (
        <section className="space-y-5 rounded-xl border border-border bg-secondary/30 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Incoming tweet
              {preview.authorHandle ? ` · @${preview.authorHandle}` : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">{preview.sourceText}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Context coverage · {preview.coveragePercent}%
            </p>
            <ul className="mt-2 space-y-1 font-mono text-sm text-zinc-300">
              {SLOT_LABELS.map(([key, label]) => (
                <li key={key} className="flex justify-between gap-4">
                  <span>{label}</span>
                  <span>{slots?.[key] ? "✓" : "✗"}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Opportunity score
            </p>
            <p className="mt-1 text-2xl font-semibold text-[#FFD700]">{preview.opportunityScore}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Generated draft
              {preview.confidence != null ? ` · confidence ${preview.confidence}` : ""}
            </p>
            <textarea
              value={editableDraft}
              onChange={(e) => setEditableDraft(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-zinc-100"
            />
            {silence ? (
              <p className="mt-2 text-xs text-amber-200/90">
                System chose silence/ignore. Grade A/B if that was right; C/D if ActorRating should
                have replied.
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {preview.promptVersion} · {preview.model}
              {preview.generationMs != null ? ` · ${preview.generationMs}ms` : ""}
              {preview.publishStatus ? ` · publish ${preview.publishStatus}` : ""}
              {preview.publishedTweetId ? ` · x.com/i/web/status/${preview.publishedTweetId}` : ""}
            </p>
          </div>

          {!silence ? (
            <div className="space-y-2 rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FFD700]/80">
                Soft-launch · Approve &amp; Post
              </p>
              <label className="block text-xs text-muted-foreground">
                Source tweet id or URL
                <input
                  value={replyTweetId}
                  onChange={(e) => setReplyTweetId(e.target.value)}
                  placeholder="1850… or https://x.com/…/status/1850…"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                />
              </label>
              <button
                type="button"
                disabled={
                  busy ||
                  preview.publishStatus === "PUBLISHED" ||
                  !replyTweetId.trim() ||
                  !editableDraft.trim()
                }
                onClick={() => void publishLive()}
                className="rounded-lg border border-[#FFD700] bg-[#FFD700]/15 px-3 py-2 text-sm font-semibold text-[#FFD700] disabled:opacity-50"
              >
                {preview.publishStatus === "PUBLISHED" ? "Already posted" : "Approve & Post reply"}
              </button>
              <p className="text-[11px] text-muted-foreground">
                Requires Coolify env: ARIE_PUBLISH_ENABLED=true + X OAuth write keys. Auto needs
                ARIE_AUTO_PUBLISH_ENABLED=true and a tweet id in the queue block.
              </p>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Sub-scores (1–5)
            </p>
            <div className="space-y-3">
              {SUBS.map(([key, label, hint]) => (
                <div key={key}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-sm text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setSubsTouched(true)
                          setSubs((s) => ({ ...s, [key]: n }))
                        }}
                        className={`min-w-[2.25rem] rounded border px-2 py-1 text-sm disabled:opacity-50 ${
                          subs[key] === n
                            ? "border-[#FFD700] bg-[#FFD700]/15 text-[#FFD700]"
                            : "border-border text-muted-foreground hover:border-[#FFD700]/40"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Overall grade
            </p>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  disabled={busy}
                  onClick={() => void saveGrade(g)}
                  className={`min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                    preview.humanGrade === g
                      ? "border-[#FFD700] bg-[#FFD700]/15 text-[#FFD700]"
                      : "border-border text-foreground hover:border-[#FFD700]/50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Optional notes / pattern</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Pattern tags…"
            />
          </label>
        </section>
      )}
    </div>
  )
}
