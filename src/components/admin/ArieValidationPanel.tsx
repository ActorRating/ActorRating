"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"

type PipelineResult = {
  originalScore?: number | null
  eligible?: boolean | null
  factualConfidence?: number | null
  writerMode?: string | null
  sourceReliabilityClass?: string | null
  sourceDistributionPriority?: string | null
  claimStatuses?: Record<string, number>
  evidenceSummary?: {
    confirmed: number
    reported: number
    uncertain: number
    contradicted: number
    missingEvidence: string[]
  } | null
  draftText?: string | null
  qaPassed?: boolean | null
  qaIssues?: Array<{ type?: string; status?: string; claim?: string }>
  visualEligible?: boolean | null
  visualReason?: string | null
  stages?: Record<string, string>
  errors?: string[]
}

type ValCase = {
  id: string
  corpusItemId: string
  sourceHandle: string | null
  sourceText: string
  inputOrigin: string
  tags: string[]
  selectedForReview: boolean
  sampleReasons: string[]
  reviewPriority: number
  status: string
  errorMessage: string | null
  humanGrade: string | null
  scoreTruthfulness: number | null
  scoreUsefulness: number | null
  scoreFraming: number | null
  scoreBrandVoice: number | null
  gradeNotes: string | null
  pipelineResult: PipelineResult | null
  opportunityId: string | null
}

type Batch = {
  id: string
  name: string
  corpusVersion: string
  status: string
  runMode: string
  caseCount: number | null
  sourceDistribution: Record<string, number> | null
  arieVersions: Record<string, string> | null
  aggregateMetrics: Record<string, unknown> | null
  createdAt: string
  cases?: ValCase[]
}

export default function ArieValidationPanel() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Batch | null>(null)
  const [reviewOnly, setReviewOnly] = useState(true)
  const [name, setName] = useState("Originals validation")
  const [includeSeed, setIncludeSeed] = useState(true)
  const [runMode, setRunMode] = useState<"score_only" | "full_pipeline">("score_only")
  const [uploadJson, setUploadJson] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    const res = await fetch("/api/admin/arie/validation")
    if (!res.ok) {
      setError("Failed to load batches")
      return
    }
    const data = await res.json()
    setBatches(data.batches ?? [])
  }, [])

  const loadDetail = useCallback(
    async (id: string) => {
      const res = await fetch(
        `/api/admin/arie/validation?id=${encodeURIComponent(id)}&reviewOnly=${reviewOnly ? "1" : "0"}`,
      )
      if (!res.ok) return
      const data = await res.json()
      setDetail(data.batch as Batch)
      const firstReview = (data.batch.cases as ValCase[] | undefined)?.find(
        (c) => c.selectedForReview && !c.humanGrade,
      )
      setActiveCaseId(firstReview?.id ?? data.batch.cases?.[0]?.id ?? null)
    },
    [reviewOnly],
  )

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId)
  }, [selectedId, loadDetail])

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label)
    setError(null)
    setMessage(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function createBatch() {
    await run("create", async () => {
      let uploaded: unknown
      if (uploadJson.trim()) {
        uploaded = JSON.parse(uploadJson)
      }
      const res = await fetch("/api/admin/arie/validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          includeSeed,
          runMode,
          uploaded,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "create failed")
      setMessage(
        `Created ${data.batchId} · corpus ${data.corpusVersion} · ${data.itemCount} items (immutable snapshot)`,
      )
      setUploadJson("")
      await loadList()
      setSelectedId(data.batchId)
    })
  }

  async function runBatch(all = false) {
    if (!selectedId) return
    await run("run", async () => {
      const res = await fetch(`/api/admin/arie/validation/${selectedId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? {} : { limit: 5 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "run failed")
      setMessage(`Processed ${data.processed} (errors ${data.errors}) → ${data.status}`)
      await loadDetail(selectedId)
      await loadList()
    })
  }

  async function grade(caseId: string, humanGrade: "A" | "B" | "C" | "D") {
    await run("grade", async () => {
      const c = detail?.cases?.find((x) => x.id === caseId)
      const res = await fetch(`/api/admin/arie/validation/cases/${caseId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          humanGrade,
          scoreTruthfulness: c?.scoreTruthfulness ?? undefined,
          scoreUsefulness: c?.scoreUsefulness ?? undefined,
          scoreFraming: c?.scoreFraming ?? undefined,
          scoreBrandVoice: c?.scoreBrandVoice ?? undefined,
          gradeNotes: c?.gradeNotes ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "grade failed")
      setMessage(`Graded ${humanGrade}`)
      if (selectedId) await loadDetail(selectedId)
      await loadList()
    })
  }

  const active = detail?.cases?.find((c) => c.id === activeCaseId) ?? null
  const metrics = detail?.aggregateMetrics as
    | {
        abRatePercent?: number | null
        eligibleRatePercent?: number | null
        avgOpportunityScore?: number | null
        avgFactualConfidence?: number | null
        selectedForReview?: number
        graded?: number
        gradeCounts?: Record<string, number>
      }
    | null

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-black/30 p-4">
        <h2 className="mb-2 text-sm font-semibold">Create immutable validation batch</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Seed fixtures = regression corpus. Uploads = real-world batches. Combined snapshot is frozen at create.
          Distribution priority and claim reliability stay separate — no source is hardcoded as “unreliable.”
        </p>
        <div className="mb-2 flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64 rounded border border-white/15 bg-black/50 px-2 py-1.5 text-sm"
            placeholder="Batch name"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeSeed}
              onChange={(e) => setIncludeSeed(e.target.checked)}
            />
            Include originals-v1 seed fixtures
          </label>
          <select
            value={runMode}
            onChange={(e) => setRunMode(e.target.value as "score_only" | "full_pipeline")}
            className="rounded border border-white/15 bg-black/50 px-2 py-1.5 text-sm"
          >
            <option value="score_only">score_only (ingest + evidence)</option>
            <option value="full_pipeline">full_pipeline (+ concepts/draft/QA)</option>
          </select>
        </div>
        <textarea
          value={uploadJson}
          onChange={(e) => setUploadJson(e.target.value)}
          rows={4}
          placeholder='Optional upload JSON: [{ "authorHandle": "boinkbuzz", "text": "..." }, ...] or { "items": [...] }'
          className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs"
        />
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void createBatch()}
          className="mt-2 rounded-lg bg-[#FFD700] px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          {busy === "create" ? "Creating…" : "Create batch"}
        </button>
      </section>

      {(error || message) && (
        <p className={`text-sm ${error ? "text-red-400" : "text-emerald-400"}`}>
          {error || message}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
          {batches.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedId === b.id
                    ? "border-[#FFD700] bg-[#FFD700]/10"
                    : "border-white/10 bg-black/30"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-[#FFD700]">{b.status}</span>
                  <span className="text-[11px] text-muted-foreground">{b.caseCount ?? "—"}</span>
                </div>
                <p className="mt-1 text-xs">{b.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{b.corpusVersion}</p>
              </button>
            </li>
          ))}
          {!batches.length && (
            <li className="text-sm text-muted-foreground">No validation batches yet.</li>
          )}
        </ul>

        <div className="space-y-4 rounded-xl border border-white/10 bg-black/30 p-4">
          {!detail && <p className="text-sm text-muted-foreground">Select a batch.</p>}
          {detail && (
            <>
              <header className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{detail.name}</h2>
                  <span className="rounded border border-white/20 px-2 py-0.5 text-xs">
                    {detail.status}
                  </span>
                  <span className="rounded border border-white/20 px-2 py-0.5 text-xs">
                    {detail.runMode}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Corpus <span className="text-foreground">{detail.corpusVersion}</span> ·{" "}
                  {detail.caseCount} cases · created {new Date(detail.createdAt).toLocaleString()}
                </p>
                {detail.arieVersions && (
                  <p className="text-[11px] text-muted-foreground">
                    Versions: builder {detail.arieVersions.contextBuilder} · writer{" "}
                    {detail.arieVersions.writerPrompt} · QA {detail.arieVersions.qaPrompt} ·
                    constitution {detail.arieVersions.constitution}
                  </p>
                )}
                {detail.sourceDistribution && (
                  <p className="text-[11px] text-muted-foreground">
                    Sources:{" "}
                    {Object.entries(detail.sourceDistribution)
                      .map(([h, n]) => `@${h} ${n}`)
                      .join(" · ")}
                  </p>
                )}
              </header>

              {metrics && (
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <Metric label="Eligible %" value={metrics.eligibleRatePercent ?? "—"} />
                  <Metric label="Avg opportunity" value={metrics.avgOpportunityScore ?? "—"} />
                  <Metric label="Avg factual conf" value={metrics.avgFactualConfidence ?? "—"} />
                  <Metric
                    label="A/B rate"
                    value={
                      metrics.abRatePercent != null
                        ? `${metrics.abRatePercent}% (${metrics.graded ?? 0} graded)`
                        : "—"
                    }
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Action
                  busy={busy}
                  label="run5"
                  onClick={() => void runBatch(false)}
                  disabled={detail.status === "SAMPLED" || detail.status === "GRADING" || detail.status === "COMPLETE"}
                >
                  Run next 5
                </Action>
                <Action
                  busy={busy}
                  label="run"
                  onClick={() => void runBatch(true)}
                  disabled={detail.status === "SAMPLED" || detail.status === "GRADING" || detail.status === "COMPLETE"}
                >
                  Run all remaining
                </Action>
                <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={reviewOnly}
                    onChange={(e) => setReviewOnly(e.target.checked)}
                  />
                  Review subset only
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
                  {(detail.cases ?? []).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveCaseId(c.id)}
                        className={`w-full rounded border px-2 py-1.5 text-left text-xs ${
                          activeCaseId === c.id
                            ? "border-[#FFD700] bg-[#FFD700]/10"
                            : "border-white/10"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>@{c.sourceHandle}</span>
                          <span className="text-muted-foreground">
                            {c.humanGrade || (c.selectedForReview ? "review" : c.status)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[11px] text-muted-foreground">
                          {c.sourceText}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>

                {active && (
                  <CaseDetail
                    c={active}
                    onGrade={(g) => void grade(active.id, g)}
                    busy={busy}
                    onNotes={(notes) => {
                      setDetail((d) => {
                        if (!d?.cases) return d
                        return {
                          ...d,
                          cases: d.cases.map((x) =>
                            x.id === active.id ? { ...x, gradeNotes: notes } : x,
                          ),
                        }
                      })
                    }}
                    onScore={(field, n) => {
                      setDetail((d) => {
                        if (!d?.cases) return d
                        return {
                          ...d,
                          cases: d.cases.map((x) =>
                            x.id === active.id ? { ...x, [field]: n } : x,
                          ),
                        }
                      })
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded border border-white/10 px-2 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold text-[#FFD700]">{value}</div>
    </div>
  )
}

function Action({
  children,
  onClick,
  busy,
  label,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  busy: string | null
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={!!busy || disabled}
      onClick={onClick}
      className="rounded-lg border border-[#FFD700]/50 bg-[#FFD700]/15 px-3 py-1.5 text-xs font-semibold text-[#FFD700] disabled:opacity-40"
    >
      {busy === label ? "…" : children}
    </button>
  )
}

function CaseDetail({
  c,
  onGrade,
  busy,
  onNotes,
  onScore,
}: {
  c: ValCase
  onGrade: (g: "A" | "B" | "C" | "D") => void
  busy: string | null
  onNotes: (n: string) => void
  onScore: (
    field:
      | "scoreTruthfulness"
      | "scoreUsefulness"
      | "scoreFraming"
      | "scoreBrandVoice",
    n: number,
  ) => void
}) {
  const r = c.pipelineResult
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-xs text-muted-foreground">
          @{c.sourceHandle} · {c.inputOrigin} · {c.corpusItemId}
          {c.selectedForReview ? " · SELECTED FOR REVIEW" : ""}
        </div>
        <p className="mt-1 whitespace-pre-wrap">{c.sourceText}</p>
        {!!c.tags.length && (
          <p className="mt-1 text-[11px] text-muted-foreground">tags: {c.tags.join(", ")}</p>
        )}
        {!!c.sampleReasons.length && (
          <p className="mt-1 text-[11px] text-amber-300/90">
            sample: {c.sampleReasons.join(" · ")}
          </p>
        )}
      </div>

      {r && (
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Metric label="Opportunity" value={r.originalScore ?? "—"} />
          <Metric label="Factual conf" value={r.factualConfidence ?? "—"} />
          <Metric label="Distribution" value={r.sourceDistributionPriority ?? "—"} />
          <Metric label="Reliability" value={r.sourceReliabilityClass ?? "—"} />
          <Metric label="Writer mode" value={r.writerMode ?? "—"} />
          <Metric
            label="Eligible"
            value={r.eligible == null ? "—" : r.eligible ? "yes" : "no"}
          />
          <Metric
            label="QA"
            value={r.qaPassed == null ? "—" : r.qaPassed ? "PASS" : "FAIL"}
          />
          <Metric
            label="Visual"
            value={
              r.visualEligible == null
                ? "—"
                : r.visualEligible
                  ? "eligible"
                  : `no (${r.visualReason ?? ""})`
            }
          />
        </div>
      )}

      {r?.evidenceSummary && (
        <p className="text-xs text-muted-foreground">
          Evidence — confirmed {r.evidenceSummary.confirmed} · reported{" "}
          {r.evidenceSummary.reported} · uncertain {r.evidenceSummary.uncertain} · contradicted{" "}
          {r.evidenceSummary.contradicted}
        </p>
      )}

      {r?.draftText && (
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Draft</h3>
          <p className="mt-1 rounded border border-white/10 bg-black/40 p-2">{r.draftText}</p>
        </div>
      )}

      {!!r?.qaIssues?.length && (
        <ul className="text-xs text-red-300/90">
          {r.qaIssues.slice(0, 6).map((i, idx) => (
            <li key={idx}>
              {i.type}
              {i.status ? ` · ${i.status}` : ""}
              {i.claim ? ` — ${String(i.claim).slice(0, 100)}` : ""}
            </li>
          ))}
        </ul>
      )}

      {c.errorMessage && <p className="text-xs text-red-400">{c.errorMessage}</p>}

      {c.selectedForReview && (
        <div className="space-y-2 rounded border border-[#FFD700]/30 p-3">
          <h3 className="text-sm font-semibold text-[#FFD700]">Human grade</h3>
          <div className="flex flex-wrap gap-2">
            {(["A", "B", "C", "D"] as const).map((g) => (
              <button
                key={g}
                type="button"
                disabled={!!busy}
                onClick={() => onGrade(g)}
                className={`rounded px-3 py-1.5 text-sm font-semibold ${
                  c.humanGrade === g
                    ? "bg-[#FFD700] text-black"
                    : "border border-white/20 text-muted-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Truth", "scoreTruthfulness"],
                ["Useful", "scoreUsefulness"],
                ["Framing", "scoreFraming"],
                ["Voice", "scoreBrandVoice"],
              ] as const
            ).map(([label, field]) => (
              <label key={field} className="text-[11px] text-muted-foreground">
                {label} (1–5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={c[field] ?? ""}
                  onChange={(e) => onScore(field, Number(e.target.value))}
                  className="mt-0.5 w-full rounded border border-white/15 bg-black/50 px-2 py-1 text-sm text-foreground"
                />
              </label>
            ))}
          </div>
          <textarea
            value={c.gradeNotes ?? ""}
            onChange={(e) => onNotes(e.target.value)}
            rows={2}
            placeholder="Notes / cluster tags"
            className="w-full rounded border border-white/15 bg-black/50 px-2 py-1.5 text-xs"
          />
        </div>
      )}
    </div>
  )
}
