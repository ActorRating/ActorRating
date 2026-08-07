"use client"

import { useCallback, useEffect, useState } from "react"

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
  opportunityScore: number
  coveragePercent: number
  coverage: { slots: CoverageSlots; present: number; total: number; percent: number }
  draftText: string
  confidence: number | null
  promptVersion: string
  model: string
  generationMs: number | null
  humanGrade: "A" | "B" | "C" | "D" | null
  notes: string | null
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

export default function ArieEvalPanel() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [ungraded, setUngraded] = useState(0)
  const [total, setTotal] = useState(0)
  const [notes, setNotes] = useState("")
  const [tweetText, setTweetText] = useState("")
  const [authorHandle, setAuthorHandle] = useState("deadline")
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadNext = useCallback(async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/arie/previews")
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setPreview(data.preview)
      setUngraded(data.ungraded ?? 0)
      setTotal(data.total ?? 0)
      setNotes(data.preview?.notes ?? "")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Load failed")
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void loadNext()
  }, [loadNext])

  async function generate() {
    if (!tweetText.trim()) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/arie/previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tweetText.trim(),
          authorHandle: authorHandle.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? `${data.error}${data.reason ? `: ${data.reason}` : ""}`
            : `Request failed (${res.status})`,
        )
      }
      setPreview(data.preview)
      setNotes("")
      setTweetText("")
      const countsRes = await fetch("/api/admin/arie/previews")
      if (countsRes.ok) {
        const counts = await countsRes.json()
        setUngraded(counts.ungraded ?? 0)
        setTotal(counts.total ?? 0)
      }
  async function saveGrade(grade: (typeof GRADES)[number]) {
    if (!preview) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/arie/previews/${preview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ humanGrade: grade, notes }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMessage(`Saved grade ${grade}`)
      await loadNext()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  const slots = preview?.coverage?.slots

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-xs text-muted-foreground">
        Ungraded: {ungraded} · Total previews: {total}. Target corpus: ~100 real casting/film tweets.
        Improve the Context Builder when coverage is high but grades are C/D.
      </p>

      <section className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
        <h2 className="text-sm font-semibold text-foreground">Generate preview</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Author handle</span>
          <input
            value={authorHandle}
            onChange={(e) => setAuthorHandle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="deadline"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Incoming tweet</span>
          <textarea
            value={tweetText}
            onChange={(e) => setTweetText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Leonardo DiCaprio joins Nolan's next film."
          />
        </label>
        <button
          type="button"
          disabled={busy || !tweetText.trim()}
          onClick={() => void generate()}
          className="rounded-lg border border-[#FFD700]/40 px-3 py-2 text-sm text-[#FFD700] disabled:opacity-50"
        >
          Generate draft
        </button>
      </section>

      {message ? <p className="text-sm text-[#FFD700]">{message}</p> : null}

      {!preview ? (
        <p className="text-sm text-muted-foreground">
          No ungraded previews. Paste a tweet above to generate one.
        </p>
      ) : (
        <section className="space-y-5 rounded-xl border border-border bg-secondary/30 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Incoming tweet
              {preview.authorHandle ? ` · @${preview.authorHandle}` : ""}
            </p>
            <p className="mt-1 text-sm text-zinc-100 whitespace-pre-wrap">{preview.sourceText}</p>
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
            <p className="mt-1 text-base leading-relaxed text-zinc-100">{preview.draftText}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {preview.promptVersion} · {preview.model}
              {preview.generationMs != null ? ` · ${preview.generationMs}ms` : ""}
            </p>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Grade
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
            <p className="mt-2 text-xs text-muted-foreground">
              A = post unchanged · B = tiny edit · C = rewrite · D = unusable
            </p>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Optional notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Excellent comparison. / Missing Nolan collab radar."
            />
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={() => void loadNext()}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
          >
            Skip / load next ungraded
          </button>
        </section>
      )}
    </div>
  )
}
