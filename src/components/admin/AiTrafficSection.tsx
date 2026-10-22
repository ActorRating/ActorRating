import StatCard from "@/components/admin/StatCard"
import {
  analyticsWindowLabel,
  type PageViewAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"
import type { AiTrafficMetrics } from "@/lib/admin/getAiTrafficMetrics"

function formatCount(value: number): string {
  return value.toLocaleString()
}

export function AiTrafficSection({ data }: { data: AiTrafficMetrics }) {
  const windowLabel = analyticsWindowLabel(data.days as PageViewAnalyticsDays)
  const ref = data.referral

  return (
    <section className="space-y-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          AI referral & crawlers ({windowLabel})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          AI referral is classified at read time from PageView referrers (ChatGPT,
          Perplexity, Claude, Gemini, Copilot, etc.). Downstream qualified / rating /
          signup counts use IPs that had an AI-referral human pageview in the same
          window. {data.uaSpoofNote}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">
          AI referral channel ({ref.key})
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="AI-referred visits"
            value={formatCount(ref.humanPageviews)}
            subtitle="Human PageViews with AI referrer"
          />
          <StatCard
            title="Qualified (AI IPs)"
            value={formatCount(ref.qualifiedVisits)}
            subtitle="Non-bot qualified_visit from those IPs"
          />
          <StatCard
            title="Ratings (AI IPs)"
            value={formatCount(ref.ratings)}
            subtitle="rating_submitted from those IPs"
          />
          <StatCard
            title="Signups (AI IPs)"
            value={formatCount(ref.signups)}
            subtitle="signup_started from those IPs"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">AI crawlers</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Families with unverified docs are marked. Empty list means no matching UAs
          in this window.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Family</th>
                <th className="border-b border-border px-3 py-3 font-medium">Requests</th>
                <th className="border-b border-border px-3 py-3 font-medium">Top paths</th>
              </tr>
            </thead>
            <tbody>
              {data.crawlers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-sm text-muted-foreground">
                    No AI crawler user agents matched in this window.
                  </td>
                </tr>
              ) : (
                data.crawlers.map((row) => (
                  <tr key={row.id} className="text-sm text-foreground/95 align-top">
                    <td className="border-b border-border/60 px-3 py-3 font-medium">
                      {row.label}
                      {row.unverified ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (docs unverified)
                        </span>
                      ) : null}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 tabular-nums">
                      {formatCount(row.requestCount)}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-xs text-muted-foreground">
                      {row.topPaths.length === 0
                        ? "—"
                        : row.topPaths
                            .map((p) => `${p.path} (${p.count})`)
                            .join(" · ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
