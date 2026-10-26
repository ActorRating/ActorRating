import StatCard from "@/components/admin/StatCard"
import {
  analyticsWindowLabel,
  type PageViewAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"
import type { QualifiedTrafficMetrics } from "@/lib/admin/getQualifiedTrafficMetrics"
import type { ValuableRaterMetrics } from "@/lib/admin/valuable-raters"

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
        <table className="w-full min-w-[800px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-3 py-3 font-medium">Key</th>
              <th className="border-b border-border px-3 py-3 font-medium">Engaged</th>
              <th className="border-b border-border px-3 py-3 font-medium">Qualified</th>
              <th className="border-b border-border px-3 py-3 font-medium">Ratings</th>
              <th className="border-b border-border px-3 py-3 font-medium">Signups</th>
              <th className="border-b border-border px-3 py-3 font-medium">Repeat raters</th>
              <th className="border-b border-border px-3 py-3 font-medium">Human PV</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-sm text-muted-foreground">
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
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums text-muted-foreground">
                    {formatCount(row.humanPageviews)}
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

function ValuableRaterTable({
  title,
  rows,
}: {
  title: string
  rows: ValuableRaterMetrics["bySource"]
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-3 py-3 font-medium">Key</th>
              <th className="border-b border-border px-3 py-3 font-medium">New raters</th>
              <th className="border-b border-border px-3 py-3 font-medium">Engaged</th>
              <th className="border-b border-border px-3 py-3 font-medium">Returning</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-sm text-muted-foreground">
                  No valuable-rater channel data in this window.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3 font-medium break-all">
                    {row.key}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                    {formatCount(row.newRaters)}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                    {formatCount(row.engagedRaters)}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                    {formatCount(row.returningRaters)}
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
  valuableRaters,
}: {
  data: QualifiedTrafficMetrics
  valuableRaters?: ValuableRaterMetrics | null
}) {
  const windowLabel = analyticsWindowLabel(data.days as PageViewAnalyticsDays)

  return (
    <section className="space-y-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Qualified traffic ({windowLabel})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Site-wide first-party funnel.{" "}
          <strong className="font-medium text-foreground/90">Engaged humans</strong> =
          distinct IPs with a non-bot{" "}
          <code className="text-xs">qualified_visit</code> (5s dwell + interaction,
          server-gated). Use that number for “real people,” not raw pageviews.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Engaged humans"
          value={formatCount(data.engagedHumans)}
          subtitle="Distinct IPs with qualified_visit (reliable)"
        />
        <StatCard
          title="Qualified visits"
          value={formatCount(data.qualifiedVisits)}
          subtitle="Non-bot qualified_visit events (server-gated)"
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
        <StatCard
          title="Qualified → rating"
          value={formatRatio(data.qualifiedToRatingRatio)}
          subtitle="ratings ÷ qualified visits"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Noisy PageView (not for decisions)
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Non-bot pageviews"
            value={formatCount(data.humanPageviews)}
            subtitle="isLikelyBot=false (Human + Unknown) — see trust split above for proven humans"
          />
          <StatCard
            title="Bot-flagged pageviews"
            value={formatCount(data.botPageviews)}
            subtitle="PageView rows with isLikelyBot = true"
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
                  "qualified visits ÷ non-bot pageviews (capped at 100%)"
                }
              />
            )
          })()}
          <StatCard
            title="Non-bot PV without qualified"
            value={formatRatio(data.humanPageviewsWithoutQualifiedShare)}
            subtitle="Bot-suspicion indicator (not a bot count)"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Umami vs first-party</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong className="font-medium text-foreground/90">Trust for decisions:</strong>{" "}
            engaged humans, qualified visits, ratings, signups, repeat raters.
          </li>
          <li>
            <strong className="font-medium text-foreground/90">Noisy:</strong> raw PageView
            totals and Umami “visitors” (often zero-dwell headless Chrome with no referrer).
          </li>
          <li>
            Same window: Umami pageviews should be in the same ballpark as all PageView rows
            (both load on the root layout). Prefer engaged + qualified_visit over Umami uniques.
          </li>
        </ul>
      </div>

      <div className="space-y-8">
        <ChannelTable title="By first-touch utm_source / source" rows={data.bySource} />
        <ChannelTable title="By first-touch utm_campaign" rows={data.byCampaign} />
      </div>

      {valuableRaters ? (
        <div className="space-y-4 border-t border-border/60 pt-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Valuable raters</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              New = distinct userId/anonId with ≥1 rating in window. Engaged = first-ever
              rating in window and ≥3 ratings within 7 days of that first. Returning =
              first-ever rating in window and ≥2 distinct UTC days within 21 days. Channel
              keys use the first rating&apos;s utm.{" "}
              {valuableRaters.guestIdentityNote}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="New raters"
              value={formatCount(valuableRaters.newRaters)}
              subtitle="Distinct raters with ≥1 rating in window"
            />
            <StatCard
              title="Engaged raters"
              value={formatCount(valuableRaters.engagedRaters)}
              subtitle="≥3 ratings within 7d of first (first in window)"
            />
            <StatCard
              title="Returning raters"
              value={formatCount(valuableRaters.returningRaters)}
              subtitle="≥2 distinct days within 21d of first (first in window)"
            />
          </div>
          <div className="space-y-8">
            <ValuableRaterTable
              title="Valuable raters by first-rating utm_source"
              rows={valuableRaters.bySource}
            />
            <ValuableRaterTable
              title="Valuable raters by first-rating utm_campaign"
              rows={valuableRaters.byCampaign}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
