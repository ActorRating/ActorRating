"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

type Stats = {
  graded: number
  abRate: number
  dRate: number
  gradeCounts: Record<string, number>
  avgOpportunity: number | null
  avgCoverage: number | null
  silenceCounts: Record<string, number>
  bySource: Array<{ authorHandle: string | null; humanGrade: string | null; n: number }>
  recent: Array<{
    id: string
    authorHandle: string | null
    humanGrade: string | null
    opportunityScore: number
    coveragePercent: number
    promptVersion: string
    draftPreview: string
    sourcePreview: string
    gradedAt: string | null
  }>
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

export default function ArieStatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch("/api/admin/arie/stats")
    if (!res.ok) {
      setError(`Failed (${res.status})`)
      return
    }
    setStats((await res.json()) as Stats)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function copyJson() {
    if (!stats) return
    await navigator.clipboard.writeText(JSON.stringify(stats))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>
  }
  if (!stats) {
    return <p className="text-sm text-muted-foreground">Loading stats…</p>
  }

  const g = stats.gradeCounts

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:border-[#FFD700]/40"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => void copyJson()}
          className="rounded-lg border border-[#FFD700]/40 px-3 py-2 text-sm text-[#FFD700]"
        >
          {copied ? "Copied" : "Copy JSON"}
        </button>
        <Link
          href="/admin/arie"
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:border-[#FFD700]/40"
        >
          ← Back to eval
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Graded" value={String(stats.graded)} />
        <StatCard label="A+B rate" value={pct(stats.abRate)} accent />
        <StatCard label="D rate" value={pct(stats.dRate)} />
        <StatCard
          label="Avg coverage"
          value={stats.avgCoverage != null ? `${stats.avgCoverage.toFixed(1)}%` : "—"}
        />
      </section>

      <section className="rounded-xl border border-border bg-secondary/30 p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Grades</h2>
        <p className="font-mono text-sm text-zinc-300">
          A {g.A ?? 0} · B {g.B ?? 0} · C {g.C ?? 0} · D {g.D ?? 0}
          {g.ungraded ? ` · ungraded ${g.ungraded}` : ""}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Avg opportunity:{" "}
          {stats.avgOpportunity != null ? stats.avgOpportunity.toFixed(1) : "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Silence:{" "}
          {Object.entries(stats.silenceCounts)
            .map(([k, n]) => `${k} ×${n}`)
            .join(" · ") || "none"}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-secondary/30 p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent graded</h2>
        <ul className="space-y-3">
          {stats.recent.slice(0, 20).map((r) => (
            <li key={r.id} className="border-b border-border/50 pb-3 last:border-0">
              <div className="flex flex-wrap items-baseline gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-[#FFD700]">{r.humanGrade}</span>
                <span>@{r.authorHandle ?? "?"}</span>
                <span>{r.promptVersion}</span>
                <span>
                  opp {r.opportunityScore} · cov {r.coveragePercent}%
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-100">{r.draftPreview}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{r.sourcePreview}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-[#FFD700]" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  )
}
