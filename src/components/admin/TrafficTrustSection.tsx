import StatCard from "@/components/admin/StatCard"
import {
  analyticsWindowLabel,
  type PageViewAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"
import type {
  TrafficTrustMetrics,
  TrustBucket,
} from "@/lib/admin/getTrafficTrustMetrics"

function pct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "n/a"
  return `${(value * 100).toFixed(1)}%`
}

function count(value: number): string {
  return value.toLocaleString()
}

function duration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "n/a"
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem.toString().padStart(2, "0")}s`
}

function pages(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "n/a"
  return value.toFixed(2)
}

function SmallTable({
  title,
  columns,
  rows,
  empty,
}: {
  title: string
  columns: [string, string]
  rows: Array<{ key: string; label: string; count: number }>
  empty: string
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[260px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-3 py-2 font-medium">{columns[0]}</th>
              <th className="border-b border-border px-3 py-2 text-right font-medium">
                {columns[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-sm text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-2 font-medium break-all">
                    {r.label}
                  </td>
                  <td className="border-b border-border/60 px-3 py-2 text-right tabular-nums">
                    {count(r.count)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TrustRow({
  label,
  bucket,
  tone,
  note,
}: {
  label: string
  bucket: TrustBucket
  tone: string
  note: string
}) {
  return (
    <tr className="text-sm text-foreground/95">
      <td className="border-b border-border/60 px-3 py-3">
        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>
          {label}
        </span>
        <div className="mt-1 text-xs text-muted-foreground">{note}</div>
      </td>
      <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
        {count(bucket.visitors)}
      </td>
      <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
        {count(bucket.sessions)}
      </td>
      <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
        {count(bucket.pageviews)}
      </td>
      <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
        {pages(bucket.avgPagesPerSession)}
      </td>
      <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
        {duration(bucket.avgSessionDurationMs)}
      </td>
      <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
        {pct(bucket.sessions > 0 ? bucket.bouncedSessions / bucket.sessions : null)}
      </td>
    </tr>
  )
}

export function TrafficTrustSection({ data }: { data: TrafficTrustMetrics }) {
  const windowLabel = analyticsWindowLabel(data.days as PageViewAnalyticsDays)
  const total = data.human.pageviews + data.unknown.pageviews + data.bot.pageviews
  const share = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}% of all pageviews` : "—")

  return (
    <section className="space-y-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Traffic trust &amp; sessions ({windowLabel})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing is counted as human by default. <strong className="font-medium text-foreground/90">Human</strong> needs
          row-level proof (engaged, signed-in, ≥5s dwell + interaction) or the same <code className="text-xs">ar_vid</code> visitor
          proved human elsewhere — never “same IP once, so all hops are human.” <strong className="font-medium text-foreground/90">Unknown</strong> ran our JS
          but never proved anything (legacy pre-cookie traffic and zero-dwell spoofed browsers). <strong className="font-medium text-foreground/90">Bot</strong> was
          flagged by UA, header consistency, burst, crawl, verified-bot or reclassifier.
          Sessions need <code className="text-xs">ar_sid</code> (post-deploy beacons only); /admin is excluded.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Distinct humans"
          value={count(data.human.visitors)}
          subtitle="Visitors (ar_vid) with ≥1 proven-human pageview"
        />
        <StatCard
          title="Human sessions"
          value={count(data.human.sessions)}
          subtitle={`${count(data.human.engagedSessions)} engaged · ${count(data.human.bouncedSessions)} bounced`}
        />
        <StatCard
          title="Bounce rate (human)"
          value={pct(data.humanBounceRate)}
          subtitle={`1 pageview, no engagement · non-bot incl. unknown: ${pct(data.nonBotBounceRate)}`}
        />
        <StatCard
          title="Engagement rate (human)"
          value={pct(data.humanEngagementRate)}
          subtitle="GA4 definition: engaged pageview, ≥2 pages or ≥10s"
        />
        <StatCard
          title="Human pageviews"
          value={count(data.human.pageviews)}
          subtitle={share(data.human.pageviews)}
        />
        <StatCard
          title="Unknown pageviews"
          value={count(data.unknown.pageviews)}
          subtitle={`${share(data.unknown.pageviews)} · ${pct(data.unknownShareOfNonBot)} of non-bot`}
        />
        <StatCard
          title="Bot pageviews"
          value={count(data.bot.pageviews)}
          subtitle={share(data.bot.pageviews)}
        />
        <StatCard
          title="Avg human session"
          value={duration(data.human.avgSessionDurationMs)}
          subtitle={`${pages(data.human.avgPagesPerSession)} pages / session`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-3 py-3 font-medium">Trust</th>
              <th className="border-b border-border px-3 py-3 text-right font-medium">Visitors</th>
              <th className="border-b border-border px-3 py-3 text-right font-medium">Sessions</th>
              <th className="border-b border-border px-3 py-3 text-right font-medium">Pageviews</th>
              <th className="border-b border-border px-3 py-3 text-right font-medium">Pages / session</th>
              <th className="border-b border-border px-3 py-3 text-right font-medium">Avg duration</th>
              <th className="border-b border-border px-3 py-3 text-right font-medium">Bounce</th>
            </tr>
          </thead>
          <tbody>
            <TrustRow
              label="Human"
              bucket={data.human}
              tone="bg-emerald-500/15 text-emerald-300"
              note="Proven — use for decisions"
            />
            <TrustRow
              label="Unknown"
              bucket={data.unknown}
              tone="bg-amber-500/15 text-amber-300"
              note="JS ran, zero evidence — not humans until proven"
            />
            <TrustRow
              label="Bot"
              bucket={data.bot}
              tone="bg-rose-500/15 text-rose-300"
              note="Flagged (see reasons below)"
            />
          </tbody>
        </table>
      </div>

      {data.legacyNonBotPageviews > 0 ? (
        <p className="text-xs text-muted-foreground">
          {count(data.legacyNonBotPageviews)} non-bot pageviews in this window predate session tracking
          (no <code>ar_sid</code>); they appear in the pageview columns but not in sessions / bounce.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SmallTable
          title="Why pageviews were flagged as bot"
          columns={["Reason", "Pageviews"]}
          rows={data.botReasons.map((r) => ({ key: r.reason, label: r.reason, count: r.count }))}
          empty="No bot-flagged pageviews in this window."
        />
        <SmallTable
          title="Human pageviews by country (cf-ipcountry)"
          columns={["Country", "Pageviews"]}
          rows={data.humanCountries.map((r) => ({ key: r.country, label: r.country, count: r.count }))}
          empty="No country data yet (needs Cloudflare-proxied requests)."
        />
        <SmallTable
          title="Top pages (human only)"
          columns={["Path", "Pageviews"]}
          rows={data.humanTopPages.map((r) => ({ key: r.path, label: r.path, count: r.count }))}
          empty="No proven-human pageviews yet."
        />
        <SmallTable
          title="Top referrers (human only)"
          columns={["Domain", "Pageviews"]}
          rows={data.humanTopReferrers.map((r) => ({ key: r.domain, label: r.domain, count: r.count }))}
          empty="No proven-human pageviews yet."
        />
      </div>
    </section>
  )
}
