import type { PaidFunnelRow } from "@/lib/admin/getPaidAttributionFunnel"

function Table({
  title,
  rows,
}: {
  title: string
  rows: PaidFunnelRow[]
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-3 py-3 font-medium">Key</th>
              <th className="border-b border-border px-3 py-3 font-medium">Pageviews</th>
              <th className="border-b border-border px-3 py-3 font-medium">Ratings</th>
              <th className="border-b border-border px-3 py-3 font-medium">Signups</th>
              <th className="border-b border-border px-3 py-3 font-medium">Repeat raters</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-sm text-muted-foreground">
                  No tagged traffic in this window yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3 font-medium">{row.key}</td>
                  <td className="border-b border-border/60 px-3 py-3">{row.pageviews}</td>
                  <td className="border-b border-border/60 px-3 py-3">{row.ratings}</td>
                  <td className="border-b border-border/60 px-3 py-3">{row.signups}</td>
                  <td className="border-b border-border/60 px-3 py-3">{row.repeatRaters}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PaidAttributionFunnel({
  days,
  byCampaign,
  byTerm,
}: {
  days: number
  byCampaign: PaidFunnelRow[]
  byTerm: PaidFunnelRow[]
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Paid attribution funnel</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Last {days} days. Pageviews are human hits with that tag. Ratings are stamped at submit.
        Signups and repeat raters (2+ ratings) use the UTM stored on the user at signup.
      </p>
      <div className="mt-6 space-y-8">
        <Table title="By utm_campaign" rows={byCampaign} />
        <Table title="By utm_term" rows={byTerm} />
      </div>
    </section>
  )
}
