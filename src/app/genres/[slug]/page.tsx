import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createSlug } from "@/lib/createSlug"
import { HomeLayout } from "@/components/layout"

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

type Props = { params: Promise<{ slug: string }> }

function genreParts(genre: string | null | undefined): string[] {
  return (genre ?? "")
    .split(/[,|/]/)
    .map((g) => g.trim())
    .filter(Boolean)
}

async function resolveGenre(slug: string) {
  const token = slug.split("-").find((t) => t.length >= 3) ?? slug
  const movies = await prisma.movie.findMany({
    where: {
      genre: { not: null, contains: token.replace(/-/g, " "), mode: "insensitive" },
      isFeaturette: false,
    },
    select: {
      id: true,
      title: true,
      year: true,
      slug: true,
      genre: true,
    },
    orderBy: [{ year: "desc" }],
    take: 600,
  })

  let displayName = ""
  const matched = movies.filter((m) => {
    const hit = genreParts(m.genre).find((g) => createSlug(g) === slug)
    if (hit && !displayName) displayName = hit
    return !!hit
  })

  if (matched.length === 0 || !displayName) {
    const fallback = await prisma.movie.findMany({
      where: { genre: { not: null }, isFeaturette: false },
      select: {
        id: true,
        title: true,
        year: true,
        slug: true,
        genre: true,
      },
      orderBy: [{ year: "desc" }],
      take: 1500,
    })
    displayName = ""
    const fbMatched = fallback.filter((m) => {
      const hit = genreParts(m.genre).find((g) => createSlug(g) === slug)
      if (hit && !displayName) displayName = hit
      return !!hit
    })
    if (fbMatched.length === 0 || !displayName) return null
    return { name: displayName, movies: fbMatched.slice(0, 80) }
  }

  return { name: displayName, movies: matched.slice(0, 80) }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await resolveGenre(slug)
  if (!data) {
    return { title: "Genre not found", robots: { index: false, follow: true } }
  }
  return {
    title: `Best ${data.name} Performances to Rate`,
    description: `Browse ${data.name} films and rate the acting performances that define the genre on ActorRating.`,
    alternates: { canonical: `${BASE}/genres/${slug}` },
  }
}

export default async function GenrePage({ params }: Props) {
  const { slug } = await params
  const data = await resolveGenre(slug)
  if (!data) notFound()

  return (
    <HomeLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Genre</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{data.name}</h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          {data.name} titles on ActorRating. Open a movie to rate performances.
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
