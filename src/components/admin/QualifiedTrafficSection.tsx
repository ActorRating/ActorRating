import StatCard from "@/components/admin/StatCard"
import {
  analyticsWindowLabel,
  type PageViewAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"
import type { QualifiedTrafficMetrics } from "@/lib/admin/getQualifiedTrafficMetrics"

function formatRatio(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "n/a"
  return `${(value * 100).toFixed(1)}%`
}

function formatHumanToQualified(
  ratio: number | null,
  exceeded: boolean,
): { value: string; note: string | null } {
  if (exceeded) {
    return {
      value: "n/a",
      note: "Qualified count exceeds human pageviews — ratio hidden (max 100%).",
    }
  }
  return { value: formatRatio(ratio), note: null }
}

function formatCount(value: number): string {
  return value.toLocaleString()
}

function ChannelTable({
  title,
  rows,
}: {
  title: string
  rows: QualifiedTrafficMetrics["bySource"]
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-3 py-3 font-medium">Key</th>
              <th className="border-b border-border px-3 py-3 font-medium">Human PV</th>
              <th className="border-b border-border px-3 py-3 font-medium">Qualified</th>
              <th className="border-b border-border px-3 py-3 font-medium">Ratings</th>
              <th className="border-b border-border px-3 py-3 font-medium">Signups</th>
              <th className="border-b border-border px-3 py-3 font-medium">Repeat raters</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-sm text-muted-foreground">
                  No channel data in this window.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3 font-medium break-all">
                    {row.key}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                    {formatCount(row.humanPageviews)}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                    {formatCount(row.qualifiedVisits)}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                    {formatCount(row.ratings)}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                    {formatCount(row.signups)}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                    {formatCount(row.repeatRaters)}
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

export function QualifiedTrafficSection({
  data,
}: {
  data: QualifiedTrafficMetrics
}) {
  const windowLabel = analyticsWindowLabel(data.days as PageViewAnalyticsDays)

  return (
    <section className="space-y-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Qualified traffic ({windowLabel})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Site-wide first-party funnel. Human pageviews use{" "}
          <code className="text-xs">isLikelyBot = false</code>. Qualified visits are non-bot{" "}
          <code className="text-xs">qualified_visit</code> events that matched a PageView
          (same IP + path, 15m) with server dedupe.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Human pageviews"
          value={formatCount(data.humanPageviews)}
          subtitle="Non-bot PageView rows"
        />
        <StatCard
          title="Bot-flagged pageviews"
          value={formatCount(data.botPageviews)}
          subtitle="PageView rows with isLikelyBot = true"
        />
        <StatCard
          title="Qualified visits"
          value={formatCount(data.qualifiedVisits)}
          subtitle="Non-bot qualified_visit (server-gated)"
        />
        <StatCard
          title="Ratings"
          value={formatCount(data.ratings)}
          subtitle="Rating rows created in window"
        />
        <StatCard
          title="Signups"
          value={formatCount(data.signups)}
          subtitle="User accounts created in window"
        />
        <StatCard
          title="Repeat raters"
          value={formatCount(data.repeatRaters)}
          subtitle="Signups in window with ≥2 lifetime ratings"
        />
        {(() => {
          const hq = formatHumanToQualified(
            data.humanToQualifiedRatio,
            data.humanToQualifiedExceeded,
          )
          return (
            <StatCard
              title="Human → qualified"
              value={hq.value}
              subtitle={
                hq.note ??
                "qualified visits ÷ human pageviews (capped at 100%)"
              }
            />
          )
        })()}
        <StatCard
          title="Qualified → rating"
          value={formatRatio(data.qualifiedToRatingRatio)}
          subtitle="ratings ÷ qualified visits"
        />
        <StatCard
          title="Human PV without qualified"
          value={formatRatio(data.humanPageviewsWithoutQualifiedShare)}
          subtitle="Bot-suspicion indicator (not a bot count): share of human PV exceeding qualified visits"
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Umami vs first-party</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong className="font-medium text-foreground/90">Trust for decisions:</strong>{" "}
            ratings, signups, repeat raters, and qualified visits.
          </li>
          <li>
            <strong className="font-medium text-foreground/90">Noisy:</strong> raw PageView totals
            and Umami “visitors” (often zero-dwell headless Chrome with no referrer).
          </li>
          <li>
            Same window: Umami pageviews should be in the same ballpark as all PageView rows
            (both load on the root layout). Prefer human + qualified_visit over Umami uniques.
          </li>
        </ul>
      </div>

      <div className="space-y-8">
        <ChannelTable title="By first-touch utm_source / source" rows={data.bySource} />
        <ChannelTable title="By first-touch utm_campaign" rows={data.byCampaign} />
      </div>
    </section>
  )
}
