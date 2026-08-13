"use client"

import { useCallback, useEffect, useState } from "react"

type Dashboard = {
  enabled: boolean
  provider: string
  config: {
    maxCandidatesPerRun: number
    maxSourcesPerRun: number
    lookbackMinutes: number
    intervalMinutes: number
  }
  health: {
    ok: boolean
    authConfigured?: boolean
    authMethod?: string
    oauth1Configured?: boolean
    bearerConfigured: boolean
    capabilityStates?: Record<string, string>
    lastError?: string
    probeMode?: string
  }
  lastRun: {
    id: string
    status: string
    startedAt: string
    completedAt: string | null
    candidatesFound: number
    candidatesDeduped: number
    candidatesIngested: number
    candidatesRetried?: number
    scoutExcluded?: number
    opportunityEligible?: number
    opportunitiesCreated: number
    opportunityDeduped?: number
    inboundCreated?: number
    inboundDeduped?: number
    errors: unknown
  } | null
  lastSuccessfulRun?: { id: string; status: string; startedAt: string } | null
  lastRateLimitedRun?: { id: string; startedAt: string } | null
  today: {
    discovered: number
    uniquePosts: number
    worthAttention: number
    exceptional: number
    withDraft: number
    qaReady: number
  }
  sources: Array<{
    id: string
    handle: string | null
    query: string | null
    sourceType: string
    enabled: boolean
    priority: number
    lastPolledAt: string | null
    lastError: string | null
    todayCandidates: number
    todayOpportunities: number
  }>
  recentCandidates: Array<{
    id: string
    authorHandle: string | null
    text: string
    discoveredAt: string
    lastSeenAt?: string
    source: string | null
    discoveryMethod: string
    discoveryPriority: number
    velocityStatus: string
    dedupeState: string
    ingestStatus?: string
    scoutStatus: string
    originalScore: number | null
    sourceUrl: string | null
  }>
}

const capLabel: Record<string, string> = {
  user_lookup: "User lookup",
  user_timeline: "Account timeline",
  recent_search: "Recent search",
}

const stateColor: Record<string, string> = {
  available: "bg-green-500/20 text-green-300",
  unavailable: "bg-red-500/20 text-red-300",
  unknown: "bg-amber-500/20 text-amber-300",
}

export default function ArieDiscoveryPanel() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/arie/discovery")
    if (!res.ok) {
      setError("Failed to load discovery dashboard")
      return
    }
    setData((await res.json()) as Dashboard)
    setError(null)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function triggerRun() {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/arie/discovery", { method: "POST" })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? "Run failed")
        return
      }
      if (body.status === "DISABLED") {
        setMessage("Discovery disabled (ARIE_DISCOVERY_ENABLED≠true). Kill switch respected.")
      } else {
        setMessage(
          `Run ${body.status}: ${body.candidatesFound ?? 0} found, ${body.opportunitiesCreated ?? 0} new opportunities, ${body.scoutExcluded ?? 0} scout-excluded`,
        )
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">{error ?? "Loading…"}</p>
  }

  const caps = data.health.capabilityStates ?? {}

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-lg font-semibold">Status</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Enabled</dt>
            <dd className={data.enabled ? "text-green-400" : "text-amber-400"}>
              {data.enabled ? "Yes (ARIE_DISCOVERY_ENABLED=true)" : "No (kill switch ON)"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Provider</dt>
            <dd>{data.provider}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Auth configured</dt>
            <dd className={data.health.authConfigured ? "text-green-400" : "text-red-400"}>
              {data.health.authConfigured ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Auth method</dt>
            <dd>
              {data.health.authMethod === "oauth1_user_context"
                ? "OAuth 1.0a user context"
                : data.health.authMethod === "bearer"
                  ? "Bearer (app-only)"
                  : "None"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Health mode</dt>
            <dd>{data.health.probeMode ?? "observational"} (no live X probe)</dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            X capabilities (cached from real fetches — available / unavailable / unknown)
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {Object.entries(caps).map(([k, v]) => (
              <li key={k} className={`rounded-full px-2 py-1 ${stateColor[v] ?? stateColor.unknown}`}>
                {capLabel[k] ?? k}: {v}
              </li>
            ))}
            {Object.keys(caps).length === 0 && (
              <li className="text-muted-foreground">Unknown until first successful/failed fetch</li>
            )}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !data.enabled}
            onClick={() => void triggerRun()}
            className="rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-2 text-sm font-semibold text-[#FFD700] disabled:opacity-50"
          >
            Run discovery
          </button>
          {!data.enabled && (
            <span className="self-center text-xs text-amber-400">
              Enable ARIE_DISCOVERY_ENABLED=true to run (no force bypass)
            </span>
          )}
        </div>
        {message && <p className="mt-2 text-sm text-green-400">{message}</p>}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>

      {data.lastRun && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-lg font-semibold">Last run</h2>
          <p className="text-sm text-muted-foreground">
            {data.lastRun.startedAt} · {data.lastRun.status}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-8">
            <div>
              <dt className="text-muted-foreground">Found</dt>
              <dd>{data.lastRun.candidatesFound}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deduped</dt>
              <dd>{data.lastRun.candidatesDeduped}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Retried</dt>
              <dd>{data.lastRun.candidatesRetried ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ingested</dt>
              <dd>{data.lastRun.candidatesIngested}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Scout excluded</dt>
              <dd>{data.lastRun.scoutExcluded ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Eligible</dt>
              <dd>{data.lastRun.opportunityEligible ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">New opps</dt>
              <dd>{data.lastRun.opportunitiesCreated}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Opp deduped</dt>
              <dd>{data.lastRun.opportunityDeduped ?? 0}</dd>
            </div>
          </dl>
          {data.lastSuccessfulRun && (
            <p className="mt-2 text-xs text-muted-foreground">
              Last success: {data.lastSuccessfulRun.startedAt} ({data.lastSuccessfulRun.status})
            </p>
          )}
          {data.lastRateLimitedRun && (
            <p className="mt-1 text-xs text-amber-400">
              Last rate-limit: {data.lastRateLimitedRun.startedAt}
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-lg font-semibold">Today</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-6">
          <div>
            <dt className="text-muted-foreground">Discovered</dt>
            <dd>{data.today.discovered}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Unique posts</dt>
            <dd>{data.today.uniquePosts}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Worth attention</dt>
            <dd>{data.today.worthAttention}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Exceptional</dt>
            <dd>{data.today.exceptional}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">With draft</dt>
            <dd>{data.today.withDraft}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">QA ready</dt>
            <dd>{data.today.qaReady}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-lg font-semibold">Sources</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground">
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Enabled</th>
                <th className="py-2 pr-4">Priority</th>
                <th className="py-2 pr-4">Last scan</th>
                <th className="py-2 pr-4">Today cand.</th>
                <th className="py-2">Today opps</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="py-2 pr-4">
                    {s.handle ? `@${s.handle}` : s.query?.slice(0, 48)}
                    {s.lastError && (
                      <span className="ml-2 text-xs text-red-400" title={s.lastError}>
                        ⚠
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{s.enabled ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">{s.priority}</td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {s.lastPolledAt ?? "—"}
                  </td>
                  <td className="py-2 pr-4">{s.todayCandidates}</td>
                  <td className="py-2">{s.todayOpportunities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-lg font-semibold">Recent candidates</h2>
        <ul className="space-y-3">
          {data.recentCandidates.map((c) => (
            <li key={c.id} className="rounded-lg border border-white/5 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {c.authorHandle && <span>@{c.authorHandle}</span>}
                <span>{c.discoveryMethod}</span>
                <span>priority {c.discoveryPriority}</span>
                <span>velocity {c.velocityStatus}</span>
                <span>{c.ingestStatus ?? c.dedupeState}</span>
                <span>{c.scoutStatus}</span>
                {c.originalScore != null && <span>score {c.originalScore}</span>}
              </div>
              <p className="mt-1 whitespace-pre-wrap">{c.text}</p>
              {c.sourceUrl && (
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-[#FFD700]"
                >
                  Open on X
                </a>
              )}
            </li>
          ))}
          {data.recentCandidates.length === 0 && (
            <li className="text-sm text-muted-foreground">No candidates yet.</li>
          )}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        Read-only discovery surface. No publish controls. No force bypass of kill switch. Publisher
        remains the sole X write path.
      </p>
    </div>
  )
}
