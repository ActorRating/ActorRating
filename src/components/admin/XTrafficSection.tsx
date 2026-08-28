import Link from "next/link"
import GrowthChart from "@/components/admin/GrowthChart"
import StatCard from "@/components/admin/StatCard"
import {
  analyticsWindowLabel,
  type PageViewAnalyticsDays,
  type XTrafficAnalytics,
} from "@/lib/admin/getXTrafficAnalytics"
import { formatAdminDateTime, formatRelativeTime } from "@/lib/admin/time"

type Props = {
  data: XTrafficAnalytics
  hrefForDays: (days: PageViewAnalyticsDays) => string
}

export default function XTrafficSection({ data, hrefForDays }: Props) {
  const windowLabel = analyticsWindowLabel(data.days)
  const windows: Array<{ days: PageViewAnalyticsDays; label: string }> = [
    { days: 1, label: "24h" },
    { days: 7, label: "7 days" },
    { days: 30, label: "30 days" },
  ]

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">X traffic</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Human pageviews from tagged links (<code className="text-xs">utm_source=x</code> /{" "}
            <code className="text-xs">src=x</code>) or organic referrers (x.com, twitter.com, t.co).
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={`X pageviews (${windowLabel})`}
          value={data.xPageviews}
          subtitle={`${data.pctOfHumanTraffic.toFixed(1)}% of human traffic`}
        />
        <StatCard
          title={`Unique visitors (${windowLabel})`}
          value={data.uniqueVisitors}
          subtitle="Distinct IPs, X-attributed"
        />
        <StatCard
          title={`Tagged (${windowLabel})`}
          value={data.taggedPageviews}
          subtitle="utm_source / src = x"
        />
        <StatCard
          title={`Organic (${windowLabel})`}
          value={data.organicPageviews}
          subtitle="Referrer x.com / twitter / t.co"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title={`Both tagged + organic (${windowLabel})`}
          value={data.bothPageviews}
          subtitle="Hits with UTM and X referrer"
        />
        <StatCard
          title={`Signups from X (${windowLabel})`}
          value={data.usersFromX}
          subtitle="User.source = x"
        />
        <StatCard
          title={`Waitlist from X (${windowLabel})`}
          value={data.waitlistFromX}
          subtitle="WaitlistEntry.source = x"
        />
      </div>

      <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">
          X activation funnel ({windowLabel})
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          First-party events with <code className="text-xs">source=x</code> or{" "}
          <code className="text-xs">utm_source=x</code>. Event steps require deploy +
          migration; counts stay at 0 until traffic arrives.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Step</th>
                <th className="border-b border-border px-3 py-3 text-right font-medium">
                  Count
                </th>
                <th className="border-b border-border px-3 py-3 text-right font-medium">
                  From prev
                </th>
              </tr>
            </thead>
            <tbody>
              {data.activationFunnel.map((step) => (
                <tr key={step.key} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3">
                    <div className="font-medium text-foreground">{step.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums font-semibold">
                    {step.count}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {step.conversionFromPrevious == null
                      ? "—"
                      : `${step.conversionFromPrevious.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <GrowthChart
        data={data.pageviewsByDay}
        title={
          data.days === 1
            ? "X pageviews — last 24 hours (by hour)"
            : `X pageviews — last ${data.days} days`
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">
            Top landings from X ({windowLabel})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[280px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="border-b border-border px-3 py-3 font-medium">Path</th>
                  <th className="border-b border-border px-3 py-3 text-right font-medium">
                    Views
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topLandingPaths.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-sm text-muted-foreground">
                      No X-attributed landings in this window.
                    </td>
                  </tr>
                ) : (
                  data.topLandingPaths.map((row) => (
                    <tr key={row.path} className="text-sm text-foreground/95">
                      <td className="border-b border-border/60 px-3 py-3 font-medium break-all">
                        {row.path}
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

        <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">Attribution split</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tagged and organic can overlap on the same hit (shown under Both).
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
              <dt className="text-muted-foreground">Tagged only (approx)</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {Math.max(0, data.taggedPageviews - data.bothPageviews)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
              <dt className="text-muted-foreground">Organic only (approx)</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {Math.max(0, data.organicPageviews - data.bothPageviews)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Both</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {data.bothPageviews}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Recent X pageviews</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest human hits attributed to X in the selected window.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Path</th>
                <th className="border-b border-border px-3 py-3 font-medium">Referrer</th>
                <th className="border-b border-border px-3 py-3 font-medium">Attr</th>
                <th className="border-b border-border px-3 py-3 font-medium">UTM</th>
                <th className="border-b border-border px-3 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-sm text-muted-foreground">
                    No recent X pageviews.
                  </td>
                </tr>
              ) : (
                data.recent.map((row) => (
                  <tr key={row.id} className="text-sm text-foreground/95">
                    <td className="border-b border-border/60 px-3 py-3 font-medium break-all">
                      {row.path}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3">
                      {row.referrerDomain}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 capitalize">
                      {row.attribution}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3">
                      {row.utmSource ?? "—"}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                      <div>{formatAdminDateTime(row.createdAt)}</div>
                      <div className="text-xs">{formatRelativeTime(row.createdAt)}</div>
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
