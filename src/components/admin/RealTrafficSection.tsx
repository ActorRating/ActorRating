import Link from "next/link"
import StatCard from "@/components/admin/StatCard"
import {
  analyticsWindowLabel,
  type PageViewAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"
import {
  pinPreferredTrafficChannels,
  type QualifiedTrafficMetrics,
} from "@/lib/admin/getQualifiedTrafficMetrics"
import type { ValuableRaterMetrics } from "@/lib/admin/valuable-raters"

function formatCount(value: number): string {
  return value.toLocaleString()
}

type Props = {
  data: QualifiedTrafficMetrics
  valuableRaters: ValuableRaterMetrics
  hrefForDays: (days: PageViewAnalyticsDays) => string
}

export function RealTrafficSection({ data, valuableRaters, hrefForDays }: Props) {
  const windowLabel = analyticsWindowLabel(data.days as PageViewAnalyticsDays)
  const bySource = pinPreferredTrafficChannels(data.bySource)

  const windows: Array<{ days: PageViewAnalyticsDays; label: string }> = [
    { days: 1, label: "24h" },
    { days: 7, label: "7 days" },
    { days: 30, label: "30 days" },
  ]

  return (
    <section className="space-y-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Real traffic (use these)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Decision metrics for {windowLabel}. Engaged humans = distinct IPs with a
            server-gated <code className="text-xs">qualified_visit</code>. Prefer these
            over raw pageviews or “distinct humans” (dwell-only proof can inflate that).
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Engaged humans"
          value={formatCount(data.engagedHumans)}
          subtitle="Distinct IPs with qualified_visit"
        />
        <StatCard
          title="Qualified visits"
          value={formatCount(data.qualifiedVisits)}
          subtitle="Non-bot qualified_visit events"
        />
        <StatCard
          title="New raters"
          value={formatCount(valuableRaters.newRaters)}
          subtitle="Distinct raters with ≥1 rating in window"
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
          title="Returning raters"
          value={formatCount(valuableRaters.returningRaters)}
          subtitle="≥2 distinct days within 21d of first"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">By source</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          First-touch utm_source / source. Preferred channels always listed (zeros when empty).
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Source</th>
                <th className="border-b border-border px-3 py-3 font-medium">Engaged</th>
                <th className="border-b border-border px-3 py-3 font-medium">Qualified</th>
                <th className="border-b border-border px-3 py-3 font-medium">Ratings</th>
                <th className="border-b border-border px-3 py-3 font-medium">Signups</th>
                <th className="border-b border-border px-3 py-3 font-medium">Repeat raters</th>
              </tr>
            </thead>
            <tbody>
              {bySource.map((row) => (
                <tr key={row.key} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3 font-medium break-all">
                    {row.key}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                    {formatCount(row.engagedHumans)}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
