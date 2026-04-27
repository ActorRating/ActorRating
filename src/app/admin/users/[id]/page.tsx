import { notFound } from "next/navigation"
import Link from "next/link"
import StatCard from "@/components/admin/StatCard"
import { prisma } from "@/lib/prisma"
import { formatAdminDateTime, formatRelativeTime } from "@/lib/admin/time"

export const dynamic = "force-dynamic"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      createdAt: true,
      ratings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          weightedScore: true,
          createdAt: true,
          actor: { select: { name: true } },
          movie: { select: { title: true } },
        },
      },
    },
  })

  if (!user) notFound()

  const totalRatings = user.ratings.length
  const averageRating =
    totalRatings > 0
      ? user.ratings.reduce((sum, rating) => sum + rating.weightedScore, 0) / totalRatings
      : 0
  const lastActivity = user.ratings[0]?.createdAt ?? user.createdAt

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-8">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← Back to admin dashboard
        </Link>
      </div>

      <div className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">
          {user.username ?? user.name ?? "Unnamed User"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Joined: {formatAdminDateTime(user.createdAt)}
        </p>
      </div>

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard title="Total Ratings" value={totalRatings} />
        <StatCard title="Average Rating" value={averageRating.toFixed(2)} />
        <StatCard
          title="Last Activity"
          value={formatAdminDateTime(lastActivity)}
          subtitle={formatRelativeTime(lastActivity)}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Full Ratings History</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Actor</th>
                <th className="border-b border-border px-3 py-3 font-medium">Movie</th>
                <th className="border-b border-border px-3 py-3 font-medium">Score</th>
                <th className="border-b border-border px-3 py-3 font-medium">Created At</th>
              </tr>
            </thead>
            <tbody>
              {user.ratings.map((rating) => (
                <tr key={rating.id} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3">{rating.actor.name}</td>
                  <td className="border-b border-border/60 px-3 py-3">{rating.movie.title}</td>
                  <td className="border-b border-border/60 px-3 py-3 font-semibold">
                    {rating.weightedScore.toFixed(1)}
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
    </div>
  )
}
