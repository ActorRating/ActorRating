import type { AdminRecentRating } from "@/lib/admin/getAdminData"

type RecentRatingsProps = {
  ratings: AdminRecentRating[]
}

function formatRelativeTime(date: Date) {
  const diffMs = date.getTime() - Date.now()
  const diffSeconds = Math.round(diffMs / 1000)
  const absSeconds = Math.abs(diffSeconds)
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (absSeconds < 60) return rtf.format(diffSeconds, "second")
  const minutes = Math.round(diffSeconds / 60)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour")
  const days = Math.round(hours / 24)
  return rtf.format(days, "day")
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
                  {formatRelativeTime(rating.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
