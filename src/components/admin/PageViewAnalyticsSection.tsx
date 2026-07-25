import Link from "next/link"
import GrowthChart from "@/components/admin/GrowthChart"
import StatCard from "@/components/admin/StatCard"
import type { PageViewAnalytics } from "@/lib/admin/getPageViewAnalytics"

type Props = {
  data: PageViewAnalytics
  /** Current query string builder for 7/30 toggle */
  hrefForDays: (days: 7 | 30) => string
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
  const total7 = data.botVsHuman.human + data.botVsHuman.bot
  const humanPct = total7 > 0 ? (data.botVsHuman.human / total7) * 100 : 0
  const botPct = total7 > 0 ? (data.botVsHuman.bot / total7) * 100 : 0
  const knownPct =
    data.botVsHuman.bot > 0
      ? (data.botVsHuman.knownCrawler / data.botVsHuman.bot) * 100
      : 0
  const unidentifiedPct =
    data.botVsHuman.bot > 0
      ? (data.botVsHuman.unidentified / data.botVsHuman.bot) * 100
      : 0

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
          <Link
            href={hrefForDays(7)}
            className={`rounded-lg border px-3 py-2 ${
              data.days === 7
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-background"
            }`}
          >
            7 days
          </Link>
          <Link
            href={hrefForDays(30)}
            className={`rounded-lg border px-3 py-2 ${
              data.days === 30
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-background"
            }`}
          >
            30 days
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Human pageviews (7d)"
          value={data.botVsHuman.human}
          subtitle={`${humanPct.toFixed(1)}% of traffic`}
        />
        <StatCard
          title="Bot total (7d)"
          value={data.botVsHuman.bot}
          subtitle={`${botPct.toFixed(1)}% of traffic`}
        />
        <StatCard
          title="Known crawlers (7d)"
          value={data.botVsHuman.knownCrawler}
          subtitle={`${knownPct.toFixed(1)}% of bots — Applebot, Googlebot, Meta, etc.`}
        />
        <StatCard
          title="Unidentified bots (7d)"
          value={data.botVsHuman.unidentified}
          subtitle={`${unidentifiedPct.toFixed(1)}% of bots — worth investigating`}
        />
      </div>

      <GrowthChart
        data={data.humanPageviewsByDay}
        title={`Real Pageviews — last ${data.days} days (human only)`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankTable
          title={`Top Referrers (${data.days}d, human)`}
          columns={["Domain", "Views"]}
          rows={data.topReferrers.map((r) => ({
            key: r.domain,
            label: r.domain,
            count: r.count,
          }))}
          empty="No referrers yet — waiting for pageview data."
        />
        <RankTable
          title={`UTM Source Breakdown (${data.days}d, human)`}
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
        title={`Top Pages (${data.days}d, human)`}
        columns={["Path", "Views"]}
        rows={data.topPages.map((r) => ({
          key: r.path,
          label: r.path,
          count: r.count,
        }))}
        empty="No pageviews yet — apply the PageView migration and browse the site."
      />
    </section>
  )
}
