import Link from "next/link"
import type { Cohort1CrossedRow } from "@/lib/admin/getCohort1RecentlyIndexable"
import { formatAdminDateTime, formatRelativeTime } from "@/lib/admin/time"

type Props = {
  rows: Cohort1CrossedRow[]
  lookbackDays: number
  threshold: number
}

export default function Cohort1RecentlyIndexablePanel({
  rows,
  lookbackDays,
  threshold,
}: Props) {
  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Cohort-1 just crossed ≥{threshold} ratings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          LEAD/SUPPORTING performances on indexing cohort 1 whose{" "}
          <strong>2nd rating</strong> landed in the last {lookbackDays} days (all ratings count,
          matching the rate-page SEO gate). Good candidates for sitemap regen / Search Console.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No cohort-1 pages crossed the ≥{threshold} threshold in the last {lookbackDays} days.
          </p>
        ) : (
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Performance</th>
                <th className="border-b border-border px-3 py-3 font-medium">Tier</th>
                <th className="border-b border-border px-3 py-3 font-medium">Ratings</th>
                <th className="border-b border-border px-3 py-3 font-medium">Crossed ≥{threshold}</th>
                <th className="border-b border-border px-3 py-3 font-medium">Last rated</th>
                <th className="border-b border-border px-3 py-3 font-medium">Indexable</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.actorId}:${row.movieId}`}
                  className="text-sm text-foreground/95"
                >
                  <td className="border-b border-border/60 px-3 py-3">
                    <Link
                      href={row.rateHref}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {row.actorName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {row.movieTitle} ({row.movieYear})
                    </div>
                  </td>
                  <td className="border-b border-border/60 px-3 py-3">{row.tier}</td>
                  <td className="border-b border-border/60 px-3 py-3 font-semibold tabular-nums">
                    {row.ratingCount}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                    <div>{formatAdminDateTime(row.crossedAt)}</div>
                    <div className="text-xs">{formatRelativeTime(row.crossedAt)}</div>
                  </td>
                  <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                    <div>{formatAdminDateTime(row.lastRatedAt)}</div>
                    <div className="text-xs">{formatRelativeTime(row.lastRatedAt)}</div>
                  </td>
                  <td className="border-b border-border/60 px-3 py-3">
                    {row.wouldIndex ? (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        Yes
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
