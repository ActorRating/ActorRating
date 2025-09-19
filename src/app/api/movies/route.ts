import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

export async function GET() {
  try {
    const cacheKey = makeCacheKey('movies:list', ['v2'])
    const cached = await cacheGet<any[]>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800')
      return res
    }
    const movies = await prisma.movie.findMany({
      select: { id: true, title: true, year: true },
      orderBy: { title: 'asc' },
      take: 5000,
    })
    await cacheSet(cacheKey, movies, 300)
    const res = NextResponse.json(movies)
    res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800')
    return res
  } catch (error) {
    console.error("Error fetching movies:", error)
    return NextResponse.json(
      { error: "Failed to fetch movies" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, year, director, genre, tmdbId, overview } = body

    if (!title || !year) {
      return NextResponse.json(
        { error: "Title and year are required" },
        { status: 400 }
      )
    }

    const movie = await prisma.movie.create({
      data: {
        title,
        year: parseInt(year),
        director,
        genre,
        tmdbId: tmdbId ? parseInt(tmdbId) : null,
        overview,
      },
    })

    return NextResponse.json(movie, { status: 201 })
  } catch (error) {
    console.error("Error creating movie:", error)
    return NextResponse.json(
      { error: "Failed to create movie" },
      { status: 500 }
    )
  }
} 