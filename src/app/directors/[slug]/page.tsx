import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createSlug } from "@/lib/createSlug"
import { HomeLayout } from "@/components/layout"

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

type Props = { params: Promise<{ slug: string }> }

async function resolveDirector(slug: string) {
  // Pre-filter by first slug token, then exact-match with createSlug (accents/punctuation).
  const token = slug.split("-").find((t) => t.length >= 3) ?? slug.slice(0, 8)
  const movies = await prisma.movie.findMany({
    where: {
      isFeaturette: false,
      director: {
        not: null,
        contains: token.replace(/-/g, " "),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      title: true,
      year: true,
      slug: true,
      director: true,
      posterUrl: true,
    },
    orderBy: [{ year: "desc" }],
    take: 400,
  })

  const matched = movies.filter((m) => m.director && createSlug(m.director) === slug)
  if (matched.length === 0) {
    // Fallback: broader scan when token filter misses (short / multi-word names).
    const fallback = await prisma.movie.findMany({
      where: {
        director: { not: null },
        isFeaturette: false,
        NOT: { director: "" },
      },
      select: {
        id: true,
        title: true,
        year: true,
        slug: true,
        director: true,
        posterUrl: true,
      },
      orderBy: [{ year: "desc" }],
      take: 800,
    })
    const fbMatched = fallback.filter((m) => m.director && createSlug(m.director) === slug)
    if (fbMatched.length === 0) return null
    return {
      name: fbMatched[0].director!.trim(),
      movies: fbMatched.slice(0, 60),
    }
  }

  return {
    name: matched[0].director!.trim(),
    movies: matched.slice(0, 60),
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await resolveDirector(slug)
  if (!data) {
    return { title: "Director not found", robots: { index: false, follow: true } }
  }
  return {
    title: `${data.name} Movies — Performances to Rate`,
    description: `Explore films directed by ${data.name} and rate the acting performances in each title on ActorRating.`,
    alternates: { canonical: `${BASE}/directors/${slug}` },
  }
}

export default async function DirectorPage({ params }: Props) {
  const { slug } = await params
  const data = await resolveDirector(slug)
  if (!data) notFound()

  return (
    <HomeLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Director</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{data.name}</h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          Films directed by {data.name}. Open a title to explore and rate acting performances.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {data.movies.map((m) => (
            <li key={m.id}>
              <Link
                href={`/movies/${m.slug ?? m.id}`}
                className="block rounded-lg border border-white/10 px-4 py-3 hover:border-[#FFD700]/40"
              >
                <span className="font-medium text-zinc-100">{m.title}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{m.year}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </HomeLayout>
  )
}
