import Link from "next/link"
import GrowthChart from "@/components/admin/GrowthChart"
import StatCard from "@/components/admin/StatCard"
import {
  analyticsWindowLabel,
  type PageViewAnalytics,
  type PageViewAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"
import { formatAdminDateTime, formatRelativeTime } from "@/lib/admin/time"

type Props = {
  data: PageViewAnalytics
  /** Current query string builder for window toggle */
  hrefForDays: (days: PageViewAnalyticsDays) => string
}

function RankTable({
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
    <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-3 py-3 font-medium">{columns[0]}</th>
              <th className="border-b border-border px-3 py-3 font-medium text-right">
                {columns[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-sm text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3 font-medium break-all">
                    {row.label}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
                    {row.count}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function PageViewAnalyticsSection({ data, hrefForDays }: Props) {
  const windowLabel = analyticsWindowLabel(data.days)
  const total = data.botVsHuman.human + data.botVsHuman.bot
  const humanPct = total > 0 ? (data.botVsHuman.human / total) * 100 : 0
  const botPct = total > 0 ? (data.botVsHuman.bot / total) * 100 : 0
  const knownPct =
    data.botVsHuman.bot > 0
      ? (data.botVsHuman.knownCrawler / data.botVsHuman.bot) * 100
      : 0
  const unidentifiedPct =
    data.botVsHuman.bot > 0
      ? (data.botVsHuman.unidentified / data.botVsHuman.bot) * 100
      : 0

  const windows: Array<{ days: PageViewAnalyticsDays; label: string }> = [
    { days: 1, label: "24h" },
    { days: 7, label: "7 days" },
    { days: 30, label: "30 days" },
  ]

  return (
    <section className="mt-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">First-party traffic</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Human pageviews from our own DB (bots flagged, not dropped). Independent of GA4.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {windows.map((w) => (
            <Link
              key={w.days}
              href={hrefForDays(w.days)}
              className={`rounded-lg border px-3 py-2 ${
                data.days === w.days
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-background"
              }`}
            >
              {w.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title={`Unique humans (${windowLabel})`}
          value={data.uniqueHumanVisitors}
          subtitle="Distinct IPs, non-bot pageviews"
        />
        <StatCard
          title={`Human pageviews (${windowLabel})`}
          value={data.botVsHuman.human}
          subtitle={`${humanPct.toFixed(1)}% of traffic`}
        />
        <StatCard
          title={`Bot total (${windowLabel})`}
          value={data.botVsHuman.bot}
          subtitle={`${botPct.toFixed(1)}% of traffic`}
        />
        <StatCard
          title={`Known crawlers (${windowLabel})`}
          value={data.botVsHuman.knownCrawler}
          subtitle={`${knownPct.toFixed(1)}% of bots — Applebot, Googlebot, Meta, etc.`}
        />
        <StatCard
          title={`Unidentified bots (${windowLabel})`}
          value={data.botVsHuman.unidentified}
          subtitle={`${unidentifiedPct.toFixed(1)}% of bots — worth investigating`}
        />
      </div>

      <GrowthChart
        data={data.humanPageviewsByDay}
        title={
          data.days === 1
            ? "Real Pageviews — last 24 hours (human only, by hour)"
            : `Real Pageviews — last ${data.days} days (human only)`
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankTable
          title={`Top Referrers (${windowLabel}, human)`}
          columns={["Domain", "Views"]}
          rows={data.topReferrers.map((r) => ({
            key: r.domain,
            label: r.domain,
            count: r.count,
          }))}
          empty="No referrers yet — waiting for pageview data."
        />
        <RankTable
          title={`UTM Source Breakdown (${windowLabel}, human)`}
          columns={["utm_source", "Views"]}
          rows={data.utmSourceBreakdown.map((r) => ({
            key: r.source,
            label: r.source,
            count: r.count,
          }))}
          empty="No UTM-tagged views yet."
        />
      </div>

      <RankTable
        title={`Top Pages (${windowLabel}, human)`}
        columns={["Path", "Views"]}
        rows={data.topPages.map((r) => ({
          key: r.path,
          label: r.path,
          count: r.count,
        }))}
        empty="No pageviews yet — apply the PageView migration and browse the site."
      />

      <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Last human viewed pages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest non-bot pageviews site-wide (not limited to the selected window).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Path</th>
                <th className="border-b border-border px-3 py-3 font-medium">Referrer</th>
                <th className="border-b border-border px-3 py-3 font-medium">UTM</th>
                <th className="border-b border-border px-3 py-3 font-medium">Visitor</th>
                <th className="border-b border-border px-3 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentHumanPageviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-sm text-muted-foreground">
                    No human pageviews yet.
                  </td>
                </tr>
              ) : (
                data.recentHumanPageviews.map((view) => (
                  <tr key={view.id} className="text-sm text-foreground/95">
                    <td className="border-b border-border/60 px-3 py-3 font-medium break-all">
                      {view.path}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                      {view.referrerDomain}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                      {view.utmSource ?? "—"}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                      {view.signedIn ? "Signed-in" : "Guest"} · {view.ipHashShort}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                      <div>{formatAdminDateTime(view.createdAt)}</div>
                      <div className="text-xs">{formatRelativeTime(view.createdAt)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
