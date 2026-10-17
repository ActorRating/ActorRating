import type { RatingDistributionReport } from "@/lib/admin/rating-distribution"

function formatPercent(value: number | null) {
  if (value == null) return "Not calculated — no Rating rows to divide by"
  return `${value.toFixed(1)}%`
}

function Row({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <tr className="text-sm text-foreground/95">
      <td className="border-b border-border/60 px-3 py-3 font-medium">{label}</td>
      <td className="border-b border-border/60 px-3 py-3 tabular-nums">{value}</td>
      <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{detail ?? ""}</td>
    </tr>
  )
}

export default function RatingDistributionPanel({
  report,
}: {
  report: RatingDistributionReport | null
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Rating distribution</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Counts Rating rows only, grouped by actor and movie. Performance rows and TMDB scores
        are not included. Guest rows are ratings with no signed-in account. This report does not
        list accounts, comments, or guest identifiers.
      </p>

      {report == null ? (
        <p className="mt-4 text-sm text-foreground">
          This report could not be calculated. The admin database query failed, so no figures are
          shown.
        </p>
      ) : (
        <div className="mt-4 space-y-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="border-b border-border px-3 py-3 font-medium">Metric</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Count</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                <Row label="Total Rating rows" value={String(report.totalRatings)} />
                <Row label="Signed-in ratings" value={String(report.signedInRatings)} />
                <Row label="Guest ratings" value={String(report.guestRatings)} />
                <Row
                  label="Distinct actors with a rating"
                  value={String(report.distinctActors)}
                />
                <Row
                  label="Distinct actor/movie pairs"
                  value={String(report.distinctPairs)}
                />
                <Row label="Pairs with at least 5 ratings" value={String(report.pairsAtLeast5)} />
                <Row label="Pairs with at least 10 ratings" value={String(report.pairsAtLeast10)} />
                <Row label="Pairs with at least 25 ratings" value={String(report.pairsAtLeast25)} />
                <Row
                  label="Top 1 signed-in account"
                  value={formatPercent(report.top1PercentOfAll)}
                  detail={`${report.top1Ratings} of ${report.totalRatings} Rating rows · ${report.signedInAccounts} signed-in accounts`}
                />
                <Row
                  label="Top 3 signed-in accounts"
                  value={formatPercent(report.top3PercentOfAll)}
                  detail={`${report.top3Ratings} of ${report.totalRatings} Rating rows`}
                />
                <Row
                  label="Top 5 signed-in accounts"
                  value={formatPercent(report.top5PercentOfAll)}
                  detail={
                    report.signedInAccounts < 5
                      ? `${report.top5Ratings} of ${report.totalRatings} Rating rows. Only ${report.signedInAccounts} signed-in accounts have ratings, so this is all of them.`
                      : `${report.top5Ratings} of ${report.totalRatings} Rating rows`
                  }
                />
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground">
              After excluding internal and demo rows
            </h3>
            <ul className="mt-2 max-w-3xl list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                Seed-domain accounts: email ends in @actorrating.local. Those are the forum seed
                personas, and the admin hidden-user rule already matches that domain.
              </li>
              <li>
                Script accounts: the account named in the demo cleanup script, and the default
                account named in the performance seed script. Those two are not on the admin
                hidden list, so they are matched on their own.
              </li>
              <li>
                Other admin-hidden accounts: emails the admin user totals already omit. The code
                does not call these demo accounts, so they are counted separately and still
                excluded from the remaining totals.
              </li>
              <li>
                Demo rating slug demo-123, from the demo cleanup script. A row is excluded once
                even if it also matches an account rule.
              </li>
            </ul>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="border-b border-border px-3 py-3 font-medium">Metric</th>
                    <th className="border-b border-border px-3 py-3 font-medium">Count</th>
                    <th className="border-b border-border px-3 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label="Seed-domain account ratings"
                    value={String(report.seedDomainRatings)}
                  />
                  <Row
                    label="Script demo/seed account ratings"
                    value={String(report.scriptDemoRatings)}
                  />
                  <Row
                    label="Other admin-hidden account ratings"
                    value={String(report.adminHiddenOtherRatings)}
                    detail="Not labeled as demo"
                  />
                  <Row label="Demo-slug ratings" value={String(report.demoSlugRatings)} />
                  <Row
                    label="Excluded Rating rows"
                    value={String(report.excludedRatings)}
                    detail="Union of the rules above"
                  />
                  <Row label="Remaining Rating rows" value={String(report.remainingRatings)} />
                  <Row label="Remaining signed-in ratings" value={String(report.remainingSignedIn)} />
                  <Row label="Remaining guest ratings" value={String(report.remainingGuest)} />
                  <Row
                    label="Remaining distinct actors"
                    value={String(report.remainingDistinctActors)}
                  />
                  <Row
                    label="Remaining actor/movie pairs"
                    value={String(report.remainingDistinctPairs)}
                  />
                  <Row
                    label="Remaining pairs with at least 5 ratings"
                    value={String(report.remainingPairsAtLeast5)}
                  />
                  <Row
                    label="Remaining pairs with at least 10 ratings"
                    value={String(report.remainingPairsAtLeast10)}
                  />
                  <Row
                    label="Remaining pairs with at least 25 ratings"
                    value={String(report.remainingPairsAtLeast25)}
                  />
                  <Row
                    label="Top 1 remaining signed-in account"
                    value={formatPercent(report.remainingTop1PercentOfRemaining)}
                    detail={`${report.remainingTop1Ratings} of ${report.remainingRatings} remaining Rating rows · ${report.remainingSignedInAccounts} remaining signed-in accounts`}
                  />
                  <Row
                    label="Top 3 remaining signed-in accounts"
                    value={formatPercent(report.remainingTop3PercentOfRemaining)}
                    detail={`${report.remainingTop3Ratings} of ${report.remainingRatings} remaining Rating rows`}
                  />
                  <Row
                    label="Top 5 remaining signed-in accounts"
                    value={formatPercent(report.remainingTop5PercentOfRemaining)}
                    detail={
                      report.remainingSignedInAccounts < 5
                        ? `${report.remainingTop5Ratings} of ${report.remainingRatings} remaining Rating rows. Only ${report.remainingSignedInAccounts} remaining signed-in accounts have ratings.`
                        : `${report.remainingTop5Ratings} of ${report.remainingRatings} remaining Rating rows`
                    }
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
