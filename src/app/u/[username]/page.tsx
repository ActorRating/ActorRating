import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getActorUrl, getMovieUrl } from "@/lib/slugHelper"
import { normalizeUsername } from "@/lib/validation/username"
import CopyProfileLinkButton from "./CopyProfileLinkButton"

export const revalidate = 300

type Props = { params: Promise<{ username: string }> }

async function getPublicUser(usernameParam: string) {
  const username = normalizeUsername(usernameParam)
  if (!username) return null

  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          ratings: true,
          performances: true,
        },
      },
    },
  })
}

async function getPublicProfileData(userId: string) {
  const [topActorsRaw, topMoviesRaw, recentRatings] = await Promise.all([
    prisma.rating.groupBy({
      by: ["actorId"],
      where: { userId },
      _avg: { weightedScore: true },
      _count: { actorId: true },
      orderBy: { _avg: { weightedScore: "desc" } },
      take: 5,
    }),
    prisma.rating.groupBy({
      by: ["movieId"],
      where: { userId },
      _avg: { weightedScore: true },
      _count: { movieId: true },
      orderBy: { _avg: { weightedScore: "desc" } },
      take: 5,
    }),
    prisma.rating.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        actor: { select: { id: true, name: true, slug: true } },
        movie: { select: { id: true, title: true, year: true, slug: true } },
      },
    }),
  ])

  const actorIds = topActorsRaw.map((x) => x.actorId)
  const movieIds = topMoviesRaw.map((x) => x.movieId)
  const [actorRows, movieRows] = await Promise.all([
    prisma.actor.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, slug: true } }),
    prisma.movie.findMany({ where: { id: { in: movieIds } }, select: { id: true, title: true, year: true, slug: true } }),
  ])

  const actorById = new Map(actorRows.map((a) => [a.id, a]))
  const movieById = new Map(movieRows.map((m) => [m.id, m]))

  const topActors = topActorsRaw
    .map((x) => {
      const actor = actorById.get(x.actorId)
      if (!actor) return null
      return {
        actor,
        avgScore: Number(x._avg.weightedScore ?? 0),
        ratingCount: x._count.actorId,
      }
    })
    .filter(Boolean)

  const topMovies = topMoviesRaw
    .map((x) => {
      const movie = movieById.get(x.movieId)
      if (!movie) return null
      return {
        movie,
        avgScore: Number(x._avg.weightedScore ?? 0),
        ratingCount: x._count.movieId,
      }
    })
    .filter(Boolean)

  return { topActors, topMovies, recentRatings }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await getPublicUser(username)
  if (!user) {
    return {
      title: "User Profile | ActorRating",
      description: "Public ActorRating profile.",
    }
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"
  const profileUrl = `${base}/u/${user.username}`
  const displayName = user.name || `@${user.username}`
  const description = `${displayName}'s public ActorRating profile. Explore ratings and activity.`

  return {
    title: `${displayName} | ActorRating`,
    description,
    alternates: { canonical: profileUrl },
    openGraph: {
      type: "profile",
      url: profileUrl,
      title: `${displayName} | ActorRating`,
      description,
    },
    twitter: {
      card: "summary",
      title: `${displayName} | ActorRating`,
      description,
    },
  }
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const user = await getPublicUser(username)
  if (!user) notFound()
  const { topActors, topMovies, recentRatings } = await getPublicProfileData(user.id)

  const displayName = user.name || `@${user.username}`
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"
  const profileUrl = `${base}/u/${user.username}`

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
          <p className="mt-2 text-muted-foreground">@{user.username}</p>
        </div>
        <CopyProfileLinkButton profileUrl={profileUrl} />
      </header>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <section className="rounded-xl border border-border bg-secondary p-4">
          <h2 className="text-sm text-muted-foreground">Ratings</h2>
          <p className="mt-1 text-2xl font-semibold text-foreground">{user._count.ratings}</p>
        </section>
        <section className="rounded-xl border border-border bg-secondary p-4">
          <h2 className="text-sm text-muted-foreground">Performances</h2>
          <p className="mt-1 text-2xl font-semibold text-foreground">{user._count.performances}</p>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-foreground">Top rated actors</h2>
        <ul className="mt-3 space-y-2">
          {topActors.map((entry) => (
            <li key={entry.actor.id} className="rounded-lg border border-border bg-secondary p-3">
              <Link href={getActorUrl(entry.actor)} className="font-medium text-foreground hover:underline">
                {entry.actor.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                Avg score: {entry.avgScore.toFixed(1)} ({entry.ratingCount} ratings)
              </p>
            </li>
          ))}
          {topActors.length === 0 ? <li className="text-sm text-muted-foreground">No actor ratings yet.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-foreground">Top rated movies</h2>
        <ul className="mt-3 space-y-2">
          {topMovies.map((entry) => (
            <li key={entry.movie.id} className="rounded-lg border border-border bg-secondary p-3">
              <Link href={getMovieUrl(entry.movie)} className="font-medium text-foreground hover:underline">
                {entry.movie.title} ({entry.movie.year})
              </Link>
              <p className="text-sm text-muted-foreground">
                Avg score: {entry.avgScore.toFixed(1)} ({entry.ratingCount} ratings)
              </p>
            </li>
          ))}
          {topMovies.length === 0 ? <li className="text-sm text-muted-foreground">No movie ratings yet.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-foreground">Recent ratings</h2>
        <ul className="mt-3 space-y-2">
          {recentRatings.map((rating) => (
            <li key={rating.id} className="rounded-lg border border-border bg-secondary p-3">
              <p className="text-sm text-muted-foreground">
                <Link href={getActorUrl(rating.actor)} className="hover:underline text-foreground">
                  {rating.actor.name}
                </Link>{" "}
                in{" "}
                <Link href={getMovieUrl(rating.movie)} className="hover:underline text-foreground">
                  {rating.movie.title}
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                Score: {Math.round(Number(rating.weightedScore ?? 0))} • {new Date(rating.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
          {recentRatings.length === 0 ? <li className="text-sm text-muted-foreground">No recent ratings yet.</li> : null}
        </ul>
      </section>
    </main>
  )
}

