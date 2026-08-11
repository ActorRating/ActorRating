"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"

type Concept = {
  id: string
  format: string
  hook: string
  angle: string
  actorRatingAdvantage: string
  discussionQuestion: string
  dataUsed: string[]
  visualPotential: string
  estimatedStrength: number
  totalScore?: number
  riskFlags?: string[]
}

type Opportunity = {
  id: string
  originalStatus: string | null
  originalScore: number | null
  originalScoreBreakdown: Record<string, unknown> | null
  priorityAuthor: boolean
  expiresAt: string | null
  concepts: Concept[] | null
  selectedConceptId: string | null
  selectedConcept: Concept | null
  conceptRankMeta: { explanation?: string } | null
  visualSpec: Record<string, unknown> | null
  finalDraft: string | null
  qaResult: {
    passed?: boolean
    deterministic?: {
      passed: boolean
      errors: string[]
      warnings: string[]
      issues?: Array<Record<string, unknown>>
    }
    semantic?: {
      passed: boolean
      confidence: number
      summary: string
      errors: string[]
      issues?: Array<Record<string, unknown>>
    }
  } | null
  publishStatus: string
  publishedTweetId: string | null
  publishError: string | null
  coverage: {
    percent?: number
    slots?: Record<string, boolean>
  } | null
  factualConfidence?: number | null
  writerMode?: string | null
  sourceProvenance?: {
    handle?: string | null
    reliabilityClass?: string
    distributionPriority?: string
    distributionRank?: number
  } | null
  evidence?: {
    confirmed?: Array<{ text: string; status: string }>
    reported?: Array<{ text: string; status: string }>
    uncertain?: Array<{ text: string; status: string }>
    contradicted?: Array<{ text: string; status: string }>
    missingEvidence?: string[]
    potentialConflicts?: string[]
    factualConfidence?: number
    writerMode?: string
    sourceSummary?: string
    confidenceSummary?: string
  } | null
  claims?: Array<Record<string, unknown>> | null
  event: {
    text: string
    authorHandle: string | null
    externalId: string
  } | null
  conceptGenCount: number
  draftGenCount: number
  qaRunCount: number
  createdAt: string
  contentFormat?: string | null
  sourceHandle?: string | null
  predictedScore?: number | null
  predictedTier?: string | null
  predictionVersion?: string | null
  prediction?: {
    predictedScore?: number
    predictedTier?: string
    predictedImpressionsBucket?: string
    predictedEngagementRateBucket?: string
    predictedProfileVisitsBucket?: string
    predictedActorRatingClicksBucket?: string
    predictionFactors?: Record<string, number>
    measurementDimensions?: Record<string, unknown>
    notes?: string
  } | null
  attributionCode?: string | null
  socialPost?: {
    id: string
    externalPostId: string | null
    impressions: number | null
    likes: number | null
    replies: number | null
    reposts: number | null
    quotes: number | null
    bookmarks: number | null
    profileVisits: number | null
    followerDelta: number | null
    linkClicks: number | null
    engagementRate: number | null
    actorRatingClicks: number | null
    ratingsCreated: number | null
    waitlistSignups: number | null
  } | null
}

type Stats = {
  total: number
  eligible: number
  conceptsGenerated: number
  draftsGenerated: number
  qaPassed: number
  qaFailed: number
  ready: number
  published: number
  ignored: number
  expired: number
  averageOpportunityScore: number
  averageConceptScore: number | null
  averageQaConfidence: number | null
}

const FILTERS = [
  ["all", "All"],
  ["eligible", "Eligible"],
  ["high", "High score"],
  ["concepts", "Concepts"],
  ["draft", "Draft / QA fail"],
  ["ready", "Ready"],
  ["published", "Published"],
  ["ignored", "Ignored"],
  ["expired", "Expired"],
] as const

export default function ArieOriginalsPanel() {
  const [filter, setFilter] = useState<string>("eligible")
  const [list, setList] = useState<Opportunity[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Opportunity | null>(null)
  const [ingestText, setIngestText] = useState("")
  const [ingestHandle, setIngestHandle] = useState("@deadline")
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/arie/originals/stats")
    if (!res.ok) return
    setStats(await res.json())
  }, [])

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/admin/arie/originals?status=${encodeURIComponent(filter)}&limit=40`)
    if (!res.ok) {
      setError("Failed to load opportunities")
      return
    }
    const data = await res.json()
    setList(data.opportunities ?? [])
  }, [filter])

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/arie/originals?id=${encodeURIComponent(id)}`)
    if (!res.ok) return
    const data = await res.json()
    const opp = data.opportunity as Opportunity
    setDetail(opp)
    setDraft(opp.finalDraft ?? "")
  }, [])

  useEffect(() => {
    void loadStats()
    void loadList()
  }, [loadStats, loadList])

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

  async function ingest() {
    await run("ingest", async () => {
      const res = await fetch("/api/admin/arie/originals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ingestText,
          authorHandle: ingestHandle.replace(/^@/, ""),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "ingest failed")
      setMessage(
        data.deduped
          ? `Deduped → existing ${data.opportunityId}`
          : `Created ${data.opportunityId} (score ${data.originalScore})`,
      )
      setIngestText("")
      await loadList()
      await loadStats()
      if (data.opportunityId) setSelectedId(data.opportunityId)
    })
  }

  async function postAction(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || path)
    return data
  }

  async function patchAction(body: Record<string, unknown>) {
    if (!selectedId) return
    const res = await fetch(`/api/admin/arie/originals/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "patch failed")
    return data
  }

  const breakdown = detail?.originalScoreBreakdown as
    | {
        heat?: number
        relevance?: number
        visual?: number
        discussion?: number
        data?: number
        timing?: number
        actorRatingAdvantage?: string
        eventType?: string
        velocity?: string
      }
    | null

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {[
            ["Total", stats.total],
            ["Eligible", stats.eligible],
            ["Concepts", stats.conceptsGenerated],
            ["Drafts", stats.draftsGenerated],
            ["Ready", stats.ready],
            ["Published", stats.published],
            ["Avg score", stats.averageOpportunityScore],
            ["QA pass", stats.qaPassed],
          ].map(([label, val]) => (
            <div
              key={String(label)}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2"
            >
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className="text-lg font-semibold text-[#FFD700]">{val}</div>
            </div>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-white/10 bg-black/30 p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Ingest event</h2>
        <div className="mb-2 flex flex-wrap gap-2">
          <input
            value={ingestHandle}
            onChange={(e) => setIngestHandle(e.target.value)}
            className="w-40 rounded border border-white/15 bg-black/50 px-2 py-1.5 text-sm"
            placeholder="@handle"
          />
        </div>
        <textarea
          value={ingestText}
          onChange={(e) => setIngestText(e.target.value)}
          rows={3}
          placeholder="Paste casting / trailer / franchise news…"
          className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!!busy || !ingestText.trim()}
          onClick={() => void ingest()}
          className="mt-2 rounded-lg bg-[#FFD700] px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          {busy === "ingest" ? "Scoring…" : "Score opportunity"}
        </button>
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === id
                ? "border-[#FFD700] bg-[#FFD700]/15 text-[#FFD700]"
                : "border-white/15 text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(error || message) && (
        <p className={`text-sm ${error ? "text-red-400" : "text-emerald-400"}`}>
          {error || message}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
          {list.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => setSelectedId(o.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedId === o.id
                    ? "border-[#FFD700] bg-[#FFD700]/10"
                    : "border-white/10 bg-black/30 hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#FFD700]">{o.originalScore ?? "—"}</span>
                  <span className="text-[11px] text-muted-foreground">{o.originalStatus}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-foreground/90">
                  {o.event?.text || "No event text"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  @{o.event?.authorHandle || "unknown"}
                  {o.concepts ? ` · ${(o.concepts as Concept[]).length} concepts` : ""}
                </p>
              </button>
            </li>
          ))}
          {!list.length && (
            <li className="text-sm text-muted-foreground">No opportunities in this filter.</li>
          )}
        </ul>

        <div className="space-y-4 rounded-xl border border-white/10 bg-black/30 p-4">
          {!detail && <p className="text-sm text-muted-foreground">Select an opportunity.</p>}
          {detail && (
            <>
              <header className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-3xl font-bold text-[#FFD700]">
                    {detail.originalScore ?? "—"}
                  </span>
                  <span className="rounded border border-white/20 px-2 py-0.5 text-xs">
                    {detail.originalStatus}
                  </span>
                  {detail.contentFormat && (
                    <span className="rounded border border-white/20 px-2 py-0.5 text-xs">
                      {detail.contentFormat}
                    </span>
                  )}
                  {detail.priorityAuthor && (
                    <span className="text-xs text-[#FFD700]/80">priority source</span>
                  )}
                </div>
                <p className="text-sm text-foreground/90">{detail.event?.text}</p>
                <p className="text-xs text-muted-foreground">
                  @{detail.sourceHandle || detail.event?.authorHandle || "unknown"} · expires{" "}
                  {detail.expiresAt ? new Date(detail.expiresAt).toLocaleString() : "—"}
                  {typeof detail.coverage?.percent === "number"
                    ? ` · coverage ${detail.coverage.percent}%`
                    : ""}
                  {detail.attributionCode ? ` · utm_content=${detail.attributionCode}` : ""}
                </p>
              </header>

              {(detail.evidence || detail.sourceProvenance || detail.factualConfidence != null) && (
                <section className="rounded-lg border border-white/15 p-3 text-sm">
                  <h3 className="font-semibold text-[#FFD700]">Evidence / confidence</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div>
                      <div className="text-muted-foreground">Opportunity</div>
                      <div className="text-lg font-semibold text-[#FFD700]">
                        {detail.originalScore ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Factual confidence</div>
                      <div className="text-lg font-semibold">
                        {detail.factualConfidence ?? detail.evidence?.factualConfidence ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Distribution</div>
                      <div className="font-semibold">
                        {detail.sourceProvenance?.distributionPriority ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Reliability</div>
                      <div className="font-semibold">
                        {detail.sourceProvenance?.reliabilityClass ?? "—"}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Source @{detail.sourceProvenance?.handle || detail.event?.authorHandle || "unknown"} ·
                    writerMode {detail.writerMode ?? detail.evidence?.writerMode ?? "—"}
                  </p>
                  <ClaimList label="Confirmed" items={detail.evidence?.confirmed} />
                  <ClaimList label="Reported" items={detail.evidence?.reported} />
                  <ClaimList label="Uncertain" items={detail.evidence?.uncertain} />
                  <ClaimList label="Contradicted" items={detail.evidence?.contradicted} />
                  {!!detail.evidence?.missingEvidence?.length && (
                    <p className="mt-2 text-xs text-amber-300/90">
                      Missing: {detail.evidence.missingEvidence.join(" · ")}
                    </p>
                  )}
                  {!!detail.evidence?.potentialConflicts?.length && (
                    <p className="mt-1 text-xs text-red-300/90">
                      Conflicts: {detail.evidence.potentialConflicts.join(" · ")}
                    </p>
                  )}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Evidence / Grounding (debug)
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/60 p-2 text-[11px] text-muted-foreground">
                      {JSON.stringify(
                        {
                          writerMode: detail.writerMode,
                          factualConfidence: detail.factualConfidence,
                          sourceProvenance: detail.sourceProvenance,
                          evidence: detail.evidence,
                          claims: detail.claims,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </section>
              )}

              {(detail.prediction || detail.predictedScore != null) && (
                <section className="rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/5 p-3 text-sm">
                  <h3 className="font-semibold text-[#FFD700]">
                    Predicted Performance · {detail.predictedTier || detail.prediction?.predictedTier}{" "}
                    ({detail.predictedScore ?? detail.prediction?.predictedScore ?? "—"})
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {detail.predictionVersion || "original-prediction@v1.0"} · heuristic (not ML)
                  </p>
                  {detail.prediction && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div>
                        Impressions: {detail.prediction.predictedImpressionsBucket ?? "—"}
                      </div>
                      <div>
                        Engagement: {detail.prediction.predictedEngagementRateBucket ?? "—"}
                      </div>
                      <div>
                        Profile visits: {detail.prediction.predictedProfileVisitsBucket ?? "—"}
                      </div>
                      <div>
                        AR clicks: {detail.prediction.predictedActorRatingClicksBucket ?? "—"}
                      </div>
                    </div>
                  )}
                  {detail.prediction?.predictionFactors && (
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] text-muted-foreground sm:grid-cols-5">
                      {Object.entries(detail.prediction.predictionFactors).map(([k, v]) => (
                        <div key={k}>
                          {k}: {v}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {detail.socialPost && (
                <section className="rounded-lg border border-white/15 p-3 text-sm">
                  <h3 className="font-semibold">Actual Performance</h3>
                  {detail.socialPost.impressions == null ? (
                    <p className="mt-1 text-xs text-muted-foreground">Metrics pending</p>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div>Impressions: {detail.socialPost.impressions.toLocaleString()}</div>
                      <div>Likes: {detail.socialPost.likes ?? "—"}</div>
                      <div>Replies: {detail.socialPost.replies ?? "—"}</div>
                      <div>Reposts: {detail.socialPost.reposts ?? "—"}</div>
                      <div>Quotes: {detail.socialPost.quotes ?? "—"}</div>
                      <div>Profile visits: {detail.socialPost.profileVisits ?? "—"}</div>
                      <div>AR clicks: {detail.socialPost.actorRatingClicks ?? "—"}</div>
                      <div>Ratings: {detail.socialPost.ratingsCreated ?? "—"}</div>
                      <div>Waitlist: {detail.socialPost.waitlistSignups ?? "—"}</div>
                    </div>
                  )}
                  {detail.predictedScore != null && detail.socialPost.impressions != null && (
                    <PredictionVsActual
                      predicted={detail.predictedScore}
                      impressions={detail.socialPost.impressions}
                      likes={detail.socialPost.likes}
                      replies={detail.socialPost.replies}
                    />
                  )}
                </section>
              )}

              {breakdown && (
                <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
                  {(
                    [
                      ["Heat", breakdown.heat, 30],
                      ["Relevance", breakdown.relevance, 20],
                      ["Visual", breakdown.visual, 20],
                      ["Discuss", breakdown.discussion, 15],
                      ["Data", breakdown.data, 10],
                      ["Timing", breakdown.timing, 5],
                    ] as const
                  ).map(([label, val, max]) => (
                    <div key={label} className="rounded border border-white/10 px-2 py-1">
                      <div className="text-muted-foreground">{label}</div>
                      <div className="font-semibold">
                        {val ?? 0}/{max}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {breakdown?.actorRatingAdvantage && (
                <p className="text-xs text-muted-foreground">
                  Advantage: {String(breakdown.actorRatingAdvantage)}
                  {breakdown.eventType ? ` · ${breakdown.eventType}` : ""}
                  {breakdown.velocity ? ` · velocity ${breakdown.velocity}` : ""}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <ActionBtn
                  busy={busy}
                  label="concepts"
                  onClick={() =>
                    void run("concepts", async () => {
                      await postAction(`/api/admin/arie/originals/${detail.id}/concepts`)
                      await loadDetail(detail.id)
                      await loadList()
                      setMessage("Concepts generated")
                    })
                  }
                >
                  Generate concepts
                </ActionBtn>
                <ActionBtn
                  busy={busy}
                  label="draft"
                  onClick={() =>
                    void run("draft", async () => {
                      await postAction(`/api/admin/arie/originals/${detail.id}/draft`)
                      await loadDetail(detail.id)
                      setMessage("Draft generated")
                    })
                  }
                >
                  Generate draft
                </ActionBtn>
                <ActionBtn
                  busy={busy}
                  label="qa"
                  onClick={() =>
                    void run("qa", async () => {
                      await postAction(`/api/admin/arie/originals/${detail.id}/qa`)
                      await loadDetail(detail.id)
                      await loadStats()
                      setMessage("QA complete")
                    })
                  }
                >
                  Run QA
                </ActionBtn>
                <ActionBtn
                  busy={busy}
                  label="approve"
                  onClick={() =>
                    void run("approve", async () => {
                      await patchAction({ action: "approve", finalDraft: draft })
                      await loadDetail(detail.id)
                      setMessage("Approved (not published)")
                    })
                  }
                >
                  Approve
                </ActionBtn>
                <ActionBtn
                  busy={busy}
                  label="publish"
                  onClick={() =>
                    void run("publish", async () => {
                      const data = await postAction(
                        `/api/admin/arie/originals/${detail.id}/publish`,
                        { publish: true, finalDraft: draft },
                      )
                      await loadDetail(detail.id)
                      await loadStats()
                      setMessage(
                        data.tweetId
                          ? `Published ${data.tweetId}`
                          : "Approved — publish blocked by flags/credentials",
                      )
                    })
                  }
                >
                  Approve & Post
                </ActionBtn>
                <ActionBtn
                  busy={busy}
                  label="ignore"
                  tone="muted"
                  onClick={() =>
                    void run("ignore", async () => {
                      await patchAction({ action: "ignore" })
                      await loadList()
                      setSelectedId(null)
                      setDetail(null)
                    })
                  }
                >
                  Ignore
                </ActionBtn>
                <ActionBtn
                  busy={busy}
                  label="reject"
                  tone="muted"
                  onClick={() =>
                    void run("reject", async () => {
                      await patchAction({ action: "reject" })
                      await loadList()
                    })
                  }
                >
                  Reject
                </ActionBtn>
              </div>

              {Array.isArray(detail.concepts) && detail.concepts.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Concepts</h3>
                  {detail.conceptRankMeta?.explanation && (
                    <p className="text-xs text-muted-foreground">
                      {detail.conceptRankMeta.explanation}
                    </p>
                  )}
                  {detail.concepts.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-lg border p-3 text-sm ${
                        detail.selectedConceptId === c.id
                          ? "border-[#FFD700]/60 bg-[#FFD700]/5"
                          : "border-white/10"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[#FFD700]">
                          {c.format} · {c.totalScore ?? c.estimatedStrength}
                        </span>
                        <button
                          type="button"
                          className="text-xs underline"
                          onClick={() =>
                            void run("select", async () => {
                              await patchAction({
                                action: "select_concept",
                                conceptId: c.id,
                              })
                              await loadDetail(detail.id)
                            })
                          }
                        >
                          Select
                        </button>
                      </div>
                      <p className="mt-1 font-medium">{c.hook}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.angle}</p>
                      <p className="mt-1 text-xs">Q: {c.discussionQuestion}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Advantage: {c.actorRatingAdvantage}
                      </p>
                    </div>
                  ))}
                </section>
              )}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Final draft</h3>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{draft.length}/280</span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      void run("save", async () => {
                        await patchAction({ action: "edit_draft", finalDraft: draft })
                        await loadDetail(detail.id)
                        setMessage("Draft saved — re-run QA")
                      })
                    }
                  >
                    Save edit
                  </button>
                </div>
              </section>

              {detail.qaResult && (
                <section className="space-y-1 text-sm">
                  <h3 className="font-semibold">
                    QA:{" "}
                    <span className={detail.qaResult.passed ? "text-emerald-400" : "text-red-400"}>
                      {detail.qaResult.passed ? "PASS" : "FAIL"}
                    </span>
                  </h3>
                  {detail.qaResult.deterministic && (
                    <p className="text-xs text-muted-foreground">
                      Deterministic: {detail.qaResult.deterministic.passed ? "pass" : "fail"}
                      {detail.qaResult.deterministic.errors?.length
                        ? ` · ${detail.qaResult.deterministic.errors.join(", ")}`
                        : ""}
                    </p>
                  )}
                  {detail.qaResult.semantic && (
                    <p className="text-xs text-muted-foreground">
                      Semantic conf {detail.qaResult.semantic.confidence}:{" "}
                      {detail.qaResult.semantic.summary}
                    </p>
                  )}
                  {!!detail.qaResult.deterministic?.issues?.length && (
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {detail.qaResult.deterministic.issues.map((iss, i) => (
                        <li key={i}>
                          {String(iss.tier ?? "issue").toUpperCase()} · {String(iss.type)}
                          {iss.status ? ` · ${String(iss.status)}` : ""}
                          {iss.claim ? ` — ${String(iss.claim).slice(0, 120)}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {detail.visualSpec && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold">
                    Visual spec{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {detail.visualSpec.eligible === false
                        ? `· ineligible (${String(detail.visualSpec.reason ?? "n/a")})`
                        : "· eligible"}
                    </span>
                  </h3>
                  <pre className="max-h-48 overflow-auto rounded bg-black/60 p-2 text-[11px] text-muted-foreground">
                    {JSON.stringify(detail.visualSpec, null, 2)}
                  </pre>
                </section>
              )}

              {detail.publishedTweetId && (
                <p className="text-sm text-emerald-400">
                  Published:{" "}
                  <a
                    className="underline"
                    href={`https://x.com/i/web/status/${detail.publishedTweetId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {detail.publishedTweetId}
                  </a>
                </p>
              )}
              {detail.publishError && (
                <p className="text-sm text-red-400">Publish error: {detail.publishError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ClaimList({
  label,
  items,
}: {
  label: string
  items?: Array<{ text: string; status: string }>
}) {
  if (!items?.length) return null
  return (
    <div className="mt-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <ul className="mt-0.5 space-y-0.5 text-xs">
        {items.slice(0, 6).map((c, i) => (
          <li key={i}>
            <span className="text-muted-foreground">[{c.status}]</span> {c.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  busy,
  label,
  tone = "gold",
}: {
  children: ReactNode
  onClick: () => void
  busy: string | null
  label: string
  tone?: "gold" | "muted"
}) {
  return (
    <button
      type="button"
      disabled={!!busy}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
        tone === "gold"
          ? "border border-[#FFD700]/50 bg-[#FFD700]/15 text-[#FFD700]"
          : "border border-white/20 text-muted-foreground"
      }`}
    >
      {busy === label ? "…" : children}
    </button>
  )
}

function PredictionVsActual({
  predicted,
  impressions,
  likes,
  replies,
}: {
  predicted: number
  impressions: number
  likes: number | null | undefined
  replies: number | null | undefined
}) {
  let actual = 20
  if (impressions >= 500_000) actual = 98
  else if (impressions >= 100_000) actual = 90
  else if (impressions >= 25_000) actual = 80
  else if (impressions >= 5_000) actual = 68
  else if (impressions >= 1_000) actual = 55
  else actual = 35
  const eng = (likes ?? 0) + (replies ?? 0) * 2
  if (impressions > 0 && eng / impressions > 0.05) actual = Math.min(100, actual + 5)
  const delta = actual - predicted
  const label =
    delta >= 8 ? "Beat expected range" : delta <= -8 ? "Below expected range" : "Within expected range"
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Prediction vs Actual — Predicted: {predicted} · Actual normalized: {actual} · Delta:{" "}
      {delta >= 0 ? `+${delta}` : delta} · {label}
    </p>
  )
}
