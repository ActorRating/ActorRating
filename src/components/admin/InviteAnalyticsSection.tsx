import Link from "next/link"
import StatCard from "@/components/admin/StatCard"
import {
  analyticsWindowLabel,
  type PageViewAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"
import type { InviteAnalytics } from "@/lib/admin/getInviteAnalytics"
import { formatAdminDateTime, formatRelativeTime } from "@/lib/admin/time"

type Props = {
  data: InviteAnalytics
  hrefForDays: (days: PageViewAnalyticsDays) => string
}

export default function InviteAnalyticsSection({ data, hrefForDays }: Props) {
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
          <h2 className="text-xl font-semibold text-foreground">Invite codes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Landings on{" "}
            <code className="text-xs">/auth/register?code=…</code> (human) and
            redemptions in the selected window.
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title={`Register landings (${windowLabel})`}
          value={data.totalLandingHits}
          subtitle="Human hits with ?code="
        />
        <StatCard
          title={`Codes with hits (${windowLabel})`}
          value={data.codesWithHits}
          subtitle="Distinct invite codes"
        />
      </div>

      <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Per code</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Code</th>
                <th className="border-b border-border px-3 py-3 font-medium text-right">
                  Landings
                </th>
                <th className="border-b border-border px-3 py-3 font-medium text-right">
                  Unique
                </th>
                <th className="border-b border-border px-3 py-3 font-medium text-right">
                  Redeemed ({windowLabel})
                </th>
                <th className="border-b border-border px-3 py-3 font-medium text-right">
                  Used / Max
                </th>
                <th className="border-b border-border px-3 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {data.codes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-sm text-muted-foreground">
                    No invite codes yet. Seed one via admin API or{" "}
                    <code className="text-xs">prisma/seed-invite-*.ts</code>.
                  </td>
                </tr>
              ) : (
                data.codes.map((row) => (
                  <tr key={row.code} className="text-sm text-foreground/95">
                    <td className="border-b border-border/60 px-3 py-3 font-semibold">
                      {row.code}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
                      {row.landingHits}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
                      {row.uniqueVisitors}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
                      {row.redemptionsInWindow}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-right tabular-nums">
                      {row.usedCount}
                      {" / "}
                      {row.unlimited ? "∞" : row.maxUses}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3">
                      <a
                        href={row.registerUrl}
                        className="text-primary hover:underline break-all"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.registerPath}
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">
          Recent invite landings
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Human visits to register URLs with a code ({windowLabel}).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Code</th>
                <th className="border-b border-border px-3 py-3 font-medium">Path</th>
                <th className="border-b border-border px-3 py-3 font-medium">Referrer</th>
                <th className="border-b border-border px-3 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLandings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-sm text-muted-foreground">
                    No coded register landings in this window yet. Hits are tracked going
                    forward after deploy.
                  </td>
                </tr>
              ) : (
                data.recentLandings.map((row) => (
                  <tr key={row.id} className="text-sm text-foreground/95">
                    <td className="border-b border-border/60 px-3 py-3 font-semibold">
                      {row.code}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 break-all">
                      {row.path}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 break-all">
                      {row.referrer ?? "(direct)"}
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
