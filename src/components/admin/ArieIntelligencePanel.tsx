"use client"

import { useCallback, useEffect, useState } from "react"

type Candidate = {
  id: string
  tier: string
  intelligenceScore: number
  originalScore: number | null
  originalStatus: string | null
  distributionPriority: string | null
  sourceReliability: string | null
  factualConfidence: number | null
  writerMode: string | null
  actorRatingAdvantage: string | null
  whyNow: string | null
  sourceHandle: string | null
  sourceText: string | null
  concepts: Array<{
    id: string
    format: string
    hook: string
    totalScore?: number
    actorRatingPayloadPresent?: boolean
    payloadType?: string | null
  }> | null
  selectedConcept: {
    id: string
    format: string
    hook: string
    actorRatingAdvantage?: string
    actorRatingPayloadPresent?: boolean
    payloadType?: string | null
  } | null
  draftText: string | null
  qaPassed: boolean | null
  qaSummary: string | null
  actorRatingPayload: {
    present: boolean
    payloadType: string | null
    summary: string | null
  } | null
  evidenceSummary: {
    confirmed: number
    reported: number
    uncertain: number
    contradicted: number
    missingEvidence: string[]
  } | null
  visualEligible: boolean | null
  publishStatus: string
}

type Summary = {
  date: string
  totalOpportunities: number
  scanned?: number
  worthAttention: number
  exceptional: number
  withDraft: number
  qaReady: number
  candidates: Candidate[]
  publishFlags?: {
    ARIE_PUBLISH_ENABLED: boolean
    ARIE_ORIGINAL_PUBLISH_ENABLED: boolean
  }
}

const tierEmoji: Record<string, string> = {
  exceptional: "🔥",
  strong: "✨",
  worth_attention: "👀",
  other: "·",
}

export default function ArieIntelligencePanel() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/arie/intelligence?limit=12")
    if (!res.ok) {
      setError("Failed to load intelligence")
      return
    }
    const data = (await res.json()) as Summary
    setSummary(data)
    if (!selectedId && data.candidates[0]) setSelectedId(data.candidates[0].id)
  }, [selectedId])

  useEffect(() => {
    void load()
  }, [load])

  const selected = summary?.candidates.find((c) => c.id === selectedId) ?? null

  async function action(actionName: string, opportunityId: string, extra?: Record<string, unknown>) {
    setBusy(actionName)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/arie/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, opportunityId, ...extra }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || actionName)
      setMessage(`${actionName} ok`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (!summary) {
    return <p className="text-sm text-muted-foreground">Loading daily intelligence…</p>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Today · {summary.date}</div>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Scanned" value={summary.scanned ?? summary.totalOpportunities} />
          <Stat label="Worth attention" value={summary.worthAttention} />
          <Stat label="Exceptional" value={summary.exceptional} />
          <Stat label="With draft" value={summary.withDraft} />
          <Stat label="QA ready" value={summary.qaReady} />
        </div>
        {summary.publishFlags && (
          <p className="mt-3 text-xs text-muted-foreground">
            Publish flags OFF — ARIE_PUBLISH={String(summary.publishFlags.ARIE_PUBLISH_ENABLED)} ·
            ORIGINAL={String(summary.publishFlags.ARIE_ORIGINAL_PUBLISH_ENABLED)}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Ranked candidates</h2>
          {summary.candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No eligible opportunities today.</p>
          ) : (
            summary.candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                  selectedId === c.id
                    ? "border-[#FFD700]/60 bg-[#FFD700]/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {tierEmoji[c.tier] ?? "·"} {c.intelligenceScore}{" "}
                    <span className="text-muted-foreground">@{c.sourceHandle ?? "?"}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{c.originalStatus}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.sourceText}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>opp {c.originalScore ?? "?"}</span>
                  <span>dist {c.distributionPriority ?? "?"}</span>
                  <span>fc {c.factualConfidence ?? "?"}%</span>
                  <span>{c.writerMode ?? "?"}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {tierEmoji[selected.tier]} Score {selected.intelligenceScore}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected.sourceText}</p>
            </div>

            <Section title="Why now">
              <p className="text-sm">{selected.whyNow ?? "Timely film event with ActorRating context."}</p>
              {selected.actorRatingAdvantage && (
                <p className="mt-1 text-sm text-[#FFD700]/90">{selected.actorRatingAdvantage}</p>
              )}
            </Section>

            <Section title="Provenance">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge label="Reliability" value={selected.sourceReliability} />
                <Badge label="Distribution" value={selected.distributionPriority} />
                <Badge label="FC" value={selected.factualConfidence != null ? `${selected.factualConfidence}%` : null} />
                <Badge label="Mode" value={selected.writerMode} />
              </div>
              {selected.evidenceSummary && (
                <p className="mt-2 text-xs text-muted-foreground">
                  ✓{selected.evidenceSummary.confirmed} reported {selected.evidenceSummary.reported} · uncertain{" "}
                  {selected.evidenceSummary.uncertain} · contradicted {selected.evidenceSummary.contradicted}
                </p>
              )}
            </Section>

            {selected.concepts && selected.concepts.length > 0 && (
              <Section title="Concepts">
                <ul className="space-y-1 text-sm">
                  {selected.concepts.map((c) => (
                    <li key={c.id} className="rounded border border-white/10 px-2 py-1">
                      <span className="font-medium">{c.id}</span> {c.format} — {c.hook}
                      {c.actorRatingPayloadPresent && (
                        <span className="ml-2 text-xs text-emerald-400">AR payload</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Draft">
              {selected.draftText ? (
                <p className="whitespace-pre-wrap text-sm">{selected.draftText}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No draft yet.</p>
              )}
              {selected.actorRatingPayload && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Payload: {selected.actorRatingPayload.present ? "✓" : "✗"}{" "}
                  {selected.actorRatingPayload.payloadType ?? ""}
                </p>
              )}
            </Section>

            <Section title="QA">
              <p className="text-sm">
                {selected.qaPassed === true ? "✓ Passed" : selected.qaPassed === false ? "✗ Failed" : "— Not run"}
              </p>
              {selected.qaSummary && (
                <p className="mt-1 text-xs text-muted-foreground">{selected.qaSummary}</p>
              )}
            </Section>

            <div className="flex flex-wrap gap-2 pt-2">
              {!selected.concepts?.length && (
                <ActionBtn
                  disabled={!!busy}
                  onClick={() => action("generate_concepts", selected.id)}
                  label={busy === "generate_concepts" ? "…" : "Generate concepts"}
                />
              )}
              {selected.concepts?.length && !selected.draftText && (
                <ActionBtn
                  disabled={!!busy}
                  onClick={() => action("generate_draft", selected.id)}
                  label={busy === "generate_draft" ? "…" : "Generate draft"}
                />
              )}
              {selected.draftText && selected.qaPassed !== true && (
                <ActionBtn
                  disabled={!!busy}
                  onClick={() => action("run_qa", selected.id)}
                  label={busy === "run_qa" ? "…" : "Run QA"}
                />
              )}
              {selected.qaPassed && (
                <ActionBtn
                  disabled={!!busy}
                  primary
                  onClick={() => action("approve", selected.id)}
                  label={busy === "approve" ? "…" : "Approve"}
                />
              )}
              <ActionBtn
                disabled={!!busy}
                onClick={() => action("skip", selected.id)}
                label={busy === "skip" ? "…" : "Skip"}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Badge({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <span className="rounded bg-white/10 px-2 py-0.5">
      {label}: {value}
    </span>
  )
}

function ActionBtn({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
        primary
          ? "bg-[#FFD700] text-black"
          : "border border-white/20 text-foreground hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  )
}
