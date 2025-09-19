import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

export async function GET() {
  try {
    const cacheKey = makeCacheKey('actors:list', ['v2'])
    const cached = await cacheGet<any[]>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800')
      return res
    }
    const actors = await prisma.actor.findMany({
      select: { id: true, name: true, imageUrl: true },
      orderBy: { name: 'asc' },
      take: 5000,
    })
    await cacheSet(cacheKey, actors, 300)
    const res = NextResponse.json(actors)
    res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800')
    return res
  } catch (error) {
    console.error("Error fetching actors:", error)
    return NextResponse.json(
      { error: "Failed to fetch actors" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, bio, imageUrl, birthDate, nationality } = body

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const actor = await prisma.actor.create({
      data: {
        name,
        bio,
        imageUrl,
        birthDate: birthDate ? new Date(birthDate) : null,
        nationality,
      },
    })

    return NextResponse.json(actor, { status: 201 })
  } catch (error) {
    console.error("Error creating actor:", error)
    return NextResponse.json(
      { error: "Failed to create actor" },
      { status: 500 }
    )
  }
} 