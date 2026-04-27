import type { AdminRecentRating } from "@/lib/admin/getAdminData"
import { formatAdminDateTime, formatRelativeTime } from "@/lib/admin/time"

type RecentRatingsProps = {
  ratings: AdminRecentRating[]
}

export default function RecentRatings({ ratings }: RecentRatingsProps) {
  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Recent Ratings</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-3 py-3 font-medium">Actor</th>
              <th className="border-b border-border px-3 py-3 font-medium">Movie</th>
              <th className="border-b border-border px-3 py-3 font-medium">Rating</th>
              <th className="border-b border-border px-3 py-3 font-medium">User</th>
              <th className="border-b border-border px-3 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((rating) => (
              <tr key={rating.id} className="text-sm text-foreground/95">
                <td className="border-b border-border/60 px-3 py-3">{rating.actorName}</td>
                <td className="border-b border-border/60 px-3 py-3">{rating.movieTitle}</td>
                <td className="border-b border-border/60 px-3 py-3 font-semibold">
                  {rating.value.toFixed(1)}
                </td>
                <td className="border-b border-border/60 px-3 py-3">
                  {rating.username ?? "Anonymous"}
                </td>
                <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                  <div>{formatAdminDateTime(rating.createdAt)}</div>
                  <div className="text-xs">{formatRelativeTime(rating.createdAt)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
