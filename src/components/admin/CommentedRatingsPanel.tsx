import Link from "next/link"
import type { CommentedRatingRow } from "@/lib/admin/getCommentedRatings"
import { formatAdminDateTime, formatRelativeTime } from "@/lib/admin/time"

type Props = {
  rows: CommentedRatingRow[]
  totalCount: number
}

export default function CommentedRatingsPanel({ rows, totalCount }: Props) {
  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Ratings with comments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Micro-reviews on rating submissions ({totalCount} total
            {rows.length < totalCount ? `, showing latest ${rows.length}` : ""}).
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ratings with comments yet.</p>
        ) : (
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Performance</th>
                <th className="border-b border-border px-3 py-3 font-medium">User</th>
                <th className="border-b border-border px-3 py-3 font-medium">Score</th>
                <th className="border-b border-border px-3 py-3 font-medium">Comment</th>
                <th className="border-b border-border px-3 py-3 font-medium">Flags</th>
                <th className="border-b border-border px-3 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = `/rate/${row.movieSlug || row.movieId}/${row.actorSlug || row.actorId}`
                return (
                  <tr key={row.id} className="text-sm text-foreground/95 align-top">
                    <td className="border-b border-border/60 px-3 py-3">
                      <Link href={href} className="font-medium hover:text-primary hover:underline">
                        {row.actorName}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {row.movieTitle} ({row.movieYear})
                      </div>
                    </td>
                    <td className="border-b border-border/60 px-3 py-3">
                      {row.username ? (
                        <Link
                          href={`/admin/users?q=${encodeURIComponent(row.username)}`}
                          className="hover:underline"
                        >
                          @{row.username}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Guest</span>
                      )}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 font-semibold tabular-nums">
                      {(row.weightedScore / 10).toFixed(1)}
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 max-w-md">
                      <p className="whitespace-pre-wrap break-words text-foreground/90">{row.comment}</p>
                    </td>
                    <td className="border-b border-border/60 px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.isSpoiler ? (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                            Spoiler
                          </span>
                        ) : null}
                        {row.commentHidden ? (
                          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                            Hidden
                          </span>
                        ) : null}
                        {!row.isSpoiler && !row.commentHidden ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                      <div>{formatAdminDateTime(row.createdAt)}</div>
                      <div className="text-xs">{formatRelativeTime(row.createdAt)}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
