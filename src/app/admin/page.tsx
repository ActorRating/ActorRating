import Link from "next/link"
import { Prisma } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import StatCard from "@/components/admin/StatCard"
import RecentRatings from "@/components/admin/RecentRatings"
import GrowthChart from "@/components/admin/GrowthChart"
import PageViewAnalyticsSection from "@/components/admin/PageViewAnalyticsSection"
import ModerationQueue from "@/components/admin/ModerationQueue"
import WaitlistPanel from "@/components/admin/WaitlistPanel"
import { getAdminData } from "@/lib/admin/getAdminData"
import { getUsersWithStats } from "@/lib/admin/getUsersWithStats"
import {
  getPageViewAnalytics,
  parseAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"
import { formatAdminDateTime, formatRelativeTime } from "@/lib/admin/time"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"

export const dynamic = "force-dynamic"

type AdminSearchParams = {
  usersQ?: string
  usersPage?: string
  ratingsQ?: string
  user?: string
  actor?: string
  movie?: string
  page?: string
  /** Pageview analytics window: 7 or 30 */
  pv?: string
  /** Ratings list filter: all | signed | guest */
  auth?: string
}

const RATINGS_PAGE_SIZE = 50

async function getGlobalRatings(searchParams: AdminSearchParams) {
  const page = Number(searchParams.page ?? "0")
  const safePage = Number.isFinite(page) && page >= 0 ? page : 0
  const user = searchParams.user?.trim()
  const actor = searchParams.actor?.trim()
  const movie = searchParams.movie?.trim()
  const ratingsQ = searchParams.ratingsQ?.trim()
  const authFilter =
    searchParams.auth === "signed" || searchParams.auth === "guest"
      ? searchParams.auth
      : "all"

  const where: Prisma.RatingWhereInput = {
    AND: [
      authFilter === "signed"
        ? { userId: { not: null } }
        : authFilter === "guest"
          ? { userId: null }
          : {},
      user ? { user: { username: { contains: user, mode: "insensitive" } } } : {},
      actor ? { actor: { name: { contains: actor, mode: "insensitive" } } } : {},
      movie ? { movie: { title: { contains: movie, mode: "insensitive" } } } : {},
      ratingsQ
        ? {
            OR: [
              { user: { username: { contains: ratingsQ, mode: "insensitive" } } },
              { actor: { name: { contains: ratingsQ, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  }

  const cacheKey = `admin:ratings:${safePage}:${authFilter}:${user ?? "all"}:${actor ?? "all"}:${movie ?? "all"}:${ratingsQ ?? "all"}`
  if (safePage === 0) {
    const cached = getCache<{
      ratings: Awaited<ReturnType<typeof prisma.rating.findMany>>
      page: number
      totalCount: number
      hasNext: boolean
      authFilter: string
    }>(cacheKey)
    if (cached) return cached
  }

  try {
    const [totalCount, ratings] = await Promise.all([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: safePage * RATINGS_PAGE_SIZE,
        take: RATINGS_PAGE_SIZE,
        select: {
          id: true,
          weightedScore: true,
          createdAt: true,
          userId: true,
          user: { select: { id: true, username: true } },
          actor: { select: { name: true } },
          movie: { select: { title: true } },
        },
      }),
    ])

    const result = {
      ratings,
      page: safePage,
      totalCount,
      hasNext: (safePage + 1) * RATINGS_PAGE_SIZE < totalCount,
      authFilter,
    }
    if (safePage === 0) {
      setCache(cacheKey, result, 60_000)
    }
    return result
  } catch (error) {
    console.error("Admin query failed getGlobalRatings", error)
    return {
      ratings: [],
      page: safePage,
      totalCount: 0,
      hasNext: false,
      authFilter,
    }
  }
}

function createQueryString(searchParams: AdminSearchParams, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && value.length > 0) params.set(key, value)
  }
  for (const [key, value] of Object.entries(patch)) {
    if (!value) params.delete(key)
    else params.set(key, value)
  }
  return `?${params.toString()}`
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const usersPage = Number(resolvedSearchParams.usersPage ?? "0")
  const safeUsersPage = Number.isFinite(usersPage) && usersPage >= 0 ? usersPage : 0
  const pvDays = parseAnalyticsDays(resolvedSearchParams.pv)
  const [data, users, globalRatings, pageViewAnalytics, waitlist] = await Promise.all([
    getAdminData(),
    getUsersWithStats({ search: resolvedSearchParams.usersQ, page: safeUsersPage, take: 50 }),
    getGlobalRatings(resolvedSearchParams),
    getPageViewAnalytics(pvDays),
    (async () => {
      try {
        const [totalCount, entries] = await Promise.all([
          prisma.waitlistEntry.count(),
          prisma.waitlistEntry.findMany({
            orderBy: { createdAt: "desc" },
            take: 200,
            select: { id: true, email: true, source: true, createdAt: true },
          }),
        ])
        return { totalCount, entries }
      } catch (error) {
        console.error("Admin query failed waitlist", error)
        return { totalCount: 0, entries: [] as Array<{
          id: string
          email: string
          source: string | null
          createdAt: Date
        }> }
      }
    })(),
  ])

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

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Signed-in ratings"
          value={data.signedInRatings}
          subtitle={`${data.signedInRatingsToday} today`}
        />
        <StatCard
          title="Guest / anonymous ratings"
          value={data.guestRatings}
          subtitle={`${data.guestRatingsToday} today · saved from unsigned visitors`}
        />
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
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Users Who Rated"
          value={data.usersWithRatings}
          subtitle="at least 1 rating"
        />
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
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-1">
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

      <PageViewAnalyticsSection
        data={pageViewAnalytics}
        hrefForDays={(days) =>
          createQueryString(resolvedSearchParams, { pv: String(days === 1 ? 24 : days) })
        }
      />

      <div className="mt-6">
        <RecentRatings ratings={data.recentRatings} />
      </div>

      <ModerationQueue />

      <WaitlistPanel entries={waitlist.entries} totalCount={waitlist.totalCount} />

      <section className="mt-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">All Users</h2>
          <form method="get" className="flex items-center gap-2">
            <input
              type="text"
              name="usersQ"
              defaultValue={resolvedSearchParams.usersQ ?? ""}
              placeholder="Search username or email"
              className="h-10 w-64 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <input type="hidden" name="ratingsQ" value={resolvedSearchParams.ratingsQ ?? ""} />
            <input type="hidden" name="user" value={resolvedSearchParams.user ?? ""} />
            <input type="hidden" name="actor" value={resolvedSearchParams.actor ?? ""} />
            <input type="hidden" name="movie" value={resolvedSearchParams.movie ?? ""} />
            <input type="hidden" name="page" value={resolvedSearchParams.page ?? "0"} />
            <input type="hidden" name="usersPage" value="0" />
            <input type="hidden" name="pv" value={resolvedSearchParams.pv ?? String(pvDays)} />
            <input
              type="hidden"
              name="auth"
              value={
                resolvedSearchParams.auth === "signed" || resolvedSearchParams.auth === "guest"
                  ? resolvedSearchParams.auth
                  : ""
              }
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Source breakdown:</span>
          {data.sourceBreakdown.map((row) => (
            <span key={row.source}>
              {" "}
              {row.source}: {row.users}
            </span>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Username</th>
                <th className="border-b border-border px-3 py-3 font-medium">Name</th>
                <th className="border-b border-border px-3 py-3 font-medium">Email</th>
                <th className="border-b border-border px-3 py-3 font-medium">Signup</th>
                <th className="border-b border-border px-3 py-3 font-medium">Source</th>
                <th className="border-b border-border px-3 py-3 font-medium">Ratings</th>
                <th className="border-b border-border px-3 py-3 font-medium">Avg Rating</th>
                <th className="border-b border-border px-3 py-3 font-medium">First Active</th>
                <th className="border-b border-border px-3 py-3 font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {users.users.map((user) => (
                <tr key={user.id} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3">
                    <Link href={`/admin/users/${user.id}`} className="font-medium text-primary hover:underline">
                      {user.username ?? user.name ?? "Unnamed"}
                    </Link>
                  </td>
                  <td className="border-b border-border/60 px-3 py-3">{user.name ?? "—"}</td>
                  <td className="border-b border-border/60 px-3 py-3">{user.email}</td>
                  <td className="border-b border-border/60 px-3 py-3">{user.signupProvider ?? "—"}</td>
                  <td className="border-b border-border/60 px-3 py-3">{user.source ?? "unknown"}</td>
                  <td className="border-b border-border/60 px-3 py-3">{user.totalRatings}</td>
                  <td className="border-b border-border/60 px-3 py-3">
                    {user.averageRating.toFixed(2)}
                  </td>
                  <td className="border-b border-border/60 px-3 py-3">{formatAdminDateTime(user.firstActivity)}</td>
                  <td className="border-b border-border/60 px-3 py-3">{formatAdminDateTime(user.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {users.totalCount === 0
              ? "No users found"
              : `Showing ${users.page * users.take + 1}-${Math.min(
                  (users.page + 1) * users.take,
                  users.totalCount
                )} of ${users.totalCount}`}
          </div>
          <div className="flex gap-2">
            {users.page > 0 ? (
              <Link
                href={createQueryString(resolvedSearchParams, { usersPage: String(users.page - 1) })}
                className="rounded-lg border border-border px-3 py-2 hover:bg-background"
              >
                Previous
              </Link>
            ) : null}
            {users.hasNext ? (
              <Link
                href={createQueryString(resolvedSearchParams, { usersPage: String(users.page + 1) })}
                className="rounded-lg border border-border px-3 py-2 hover:bg-background"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Acquisition Performance</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[740px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Source</th>
                <th className="border-b border-border px-3 py-3 font-medium">Users</th>
                <th className="border-b border-border px-3 py-3 font-medium">Users Who Rated</th>
                <th className="border-b border-border px-3 py-3 font-medium">Conversion %</th>
              </tr>
            </thead>
            <tbody>
              {data.sourceBreakdown.map((row) => (
                <tr key={row.source} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3 font-medium">{row.source}</td>
                  <td className="border-b border-border/60 px-3 py-3">{row.users}</td>
                  <td className="border-b border-border/60 px-3 py-3">{row.usersWithRatings}</td>
                  <td className="border-b border-border/60 px-3 py-3">{row.conversion.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">All Ratings</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {(
              [
                { key: "all", label: `All (${data.totalRatings})` },
                { key: "signed", label: `Signed-in (${data.signedInRatings})` },
                { key: "guest", label: `Guest (${data.guestRatings})` },
              ] as const
            ).map((tab) => (
              <Link
                key={tab.key}
                href={createQueryString(resolvedSearchParams, {
                  auth: tab.key === "all" ? undefined : tab.key,
                  page: "0",
                })}
                className={`rounded-lg border px-3 py-2 ${
                  globalRatings.authFilter === tab.key
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:bg-background"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
        <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="ratingsQ"
              defaultValue={resolvedSearchParams.ratingsQ ?? ""}
              placeholder="Search by username or actor"
              className="h-10 w-56 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              type="text"
              name="user"
              defaultValue={resolvedSearchParams.user ?? ""}
              placeholder="Filter user"
              className="h-10 w-40 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              type="text"
              name="actor"
              defaultValue={resolvedSearchParams.actor ?? ""}
              placeholder="Filter actor"
              className="h-10 w-40 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              type="text"
              name="movie"
              defaultValue={resolvedSearchParams.movie ?? ""}
              placeholder="Filter movie"
              className="h-10 w-40 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <input type="hidden" name="usersQ" value={resolvedSearchParams.usersQ ?? ""} />
            <input type="hidden" name="usersPage" value={resolvedSearchParams.usersPage ?? "0"} />
            <input type="hidden" name="page" value="0" />
            <input type="hidden" name="pv" value={resolvedSearchParams.pv ?? String(pvDays)} />
            <input type="hidden" name="auth" value={globalRatings.authFilter === "all" ? "" : globalRatings.authFilter} />
            <Button type="submit" variant="outline">
              Apply
            </Button>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">User</th>
                <th className="border-b border-border px-3 py-3 font-medium">Actor</th>
                <th className="border-b border-border px-3 py-3 font-medium">Movie</th>
                <th className="border-b border-border px-3 py-3 font-medium">Score</th>
                <th className="border-b border-border px-3 py-3 font-medium">Created At</th>
              </tr>
            </thead>
            <tbody>
              {globalRatings.ratings.map((rating) => (
                <tr key={rating.id} className="text-sm text-foreground/95">
                  <td className="border-b border-border/60 px-3 py-3">
                    {rating.user?.id ? (
                      <Link href={`/admin/users/${rating.user.id}`} className="text-primary hover:underline">
                        {rating.user.username ?? "Anonymous"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Guest</span>
                    )}
                  </td>
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

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {globalRatings.totalCount === 0
              ? "No ratings found"
              : `Showing ${globalRatings.page * RATINGS_PAGE_SIZE + 1}-${Math.min(
                  (globalRatings.page + 1) * RATINGS_PAGE_SIZE,
                  globalRatings.totalCount
                )} of ${globalRatings.totalCount}`}
          </div>
          <div className="flex gap-2">
            {globalRatings.page > 0 ? (
              <Link
                href={createQueryString(resolvedSearchParams, { page: String(globalRatings.page - 1) })}
                className="rounded-lg border border-border px-3 py-2 hover:bg-background"
              >
                Previous
              </Link>
            ) : null}
            {globalRatings.hasNext ? (
              <Link
                href={createQueryString(resolvedSearchParams, { page: String(globalRatings.page + 1) })}
                className="rounded-lg border border-border px-3 py-2 hover:bg-background"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
