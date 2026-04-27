import Link from "next/link"
import { Button } from "@/components/ui/Button"
import StatCard from "@/components/admin/StatCard"
import RecentRatings from "@/components/admin/RecentRatings"
import GrowthChart from "@/components/admin/GrowthChart"
import { getAdminData } from "@/lib/admin/getAdminData"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const data = await getAdminData()

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live business metrics powered by server-side Prisma queries.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">Refresh</Link>
        </Button>
      </div>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={data.totalUsers} />
        <StatCard title="Total Ratings" value={data.totalRatings} />
        <StatCard title="Ratings Today" value={data.ratingsToday} />
        <StatCard title="Users Today" value={data.usersToday} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Ratings per User"
          value={data.ratingsPerUser.toFixed(2)}
          subtitle="avg engagement"
        />
        <StatCard
          title="Conversion Rate"
          value={`${data.conversionRate.toFixed(1)}%`}
          subtitle="users who rated"
        />
        <StatCard
          title="Users Who Rated"
          value={data.usersWithRatings}
          subtitle="at least 1 rating"
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatCard
          title="Total Performances"
          value={data.totalPerformances}
          subtitle="Total performance rows in database"
        />
        <StatCard
          title="Avg Rating Today"
          value={data.avgRatingToday !== null ? data.avgRatingToday.toFixed(2) : "0.00"}
          subtitle="Average weighted score for today"
        />
        <StatCard
          title="Top Actor Today"
          value={data.topActorToday?.name ?? "N/A"}
          subtitle={
            data.topActorToday ? `${data.topActorToday.count} ratings today` : "No ratings yet today"
          }
        />
      </section>

      <div className="mt-6">
        <GrowthChart data={data.growthLast7Days} />
      </div>

      <div className="mt-6">
        <RecentRatings ratings={data.recentRatings} />
      </div>
    </div>
  )
}
