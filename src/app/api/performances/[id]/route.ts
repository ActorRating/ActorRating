export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import {
  isFeaturetteMovie,
  isSelfOrArchiveCredit,
  matchesFeaturetteTitle,
} from "@/lib/non-rateable"

async function assertRateablePerformance(movieId: string, character?: string | null) {
  if (isSelfOrArchiveCredit(character)) {
    return false
  }
  const movieMeta = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true, title: true, isFeaturette: true },
  })
  if (!movieMeta) return false
  if (isFeaturetteMovie(movieMeta)) {
    if (!movieMeta.isFeaturette && matchesFeaturetteTitle(movieMeta.title)) {
      void prisma.movie
        .update({ where: { id: movieMeta.id }, data: { isFeaturette: true } })
        .catch(() => {})
    }
    return false
  }
  return true
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const performance = await prisma.performance.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        movieId: true,
        character: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        emotionalRangeDepth: true,
        characterBelievability: true,
        technicalSkill: true,
        screenPresence: true,
        chemistryInteraction: true,
        actor: { select: { id: true, name: true, imageUrl: true } },
        movie: { select: { id: true, title: true, year: true, director: true, posterUrl: true } },
      },
    })

    if (!performance) {
      return NextResponse.json(
        { error: "Performance not found" },
        { status: 404 }
      )
    }
    if (!(await assertRateablePerformance(performance.movieId, performance.character))) {
      return NextResponse.json(
        { error: "Performance not found" },
        { status: 404 }
      )
    }

    const res = NextResponse.json(performance)
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    return res
  } catch (error) {
    console.error("Error fetching performance:", error)
    return NextResponse.json(
      { error: "Failed to fetch performance" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.performance.findUnique({
      where: { id },
      select: { movieId: true, userId: true, character: true },
    })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Performance not found" }, { status: 404 })
    }
    if (!(await assertRateablePerformance(existing.movieId, existing.character))) {
      return NextResponse.json(
        { error: "Performance not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { 
      emotionalRangeDepth,
      characterBelievability,
      technicalSkill,
      screenPresence,
      chemistryInteraction,
      comment 
    } = body

    // Validate rating values (0-100)
    const ratings = [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction]
    for (const rating of ratings) {
      if (rating < 0 || rating > 100) {
        return NextResponse.json(
          { error: "All ratings must be between 0 and 100" },
          { status: 400 }
        )
      }
    }

    const performance = await prisma.performance.update({
      where: {
        id: id,
      },
      data: {
        emotionalRangeDepth,
        characterBelievability,
        technicalSkill,
        screenPresence,
        chemistryInteraction,
        comment,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        movie: {
          select: {
            id: true,
            title: true,
            year: true,
            director: true,
          },
        },
      },
    })

    return NextResponse.json(performance)
  } catch (error) {
    console.error("Error updating performance:", error)
    return NextResponse.json(
      { error: "Failed to update performance" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.performance.findUnique({
      where: { id },
      select: { movieId: true, userId: true, character: true },
    })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Performance not found" }, { status: 404 })
    }
    if (!(await assertRateablePerformance(existing.movieId, existing.character))) {
      return NextResponse.json(
        { error: "Performance not found" },
        { status: 404 }
      )
    }

    await prisma.performance.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Performance deleted successfully" })
  } catch (error) {
    console.error("Error deleting performance:", error)
    return NextResponse.json(
      { error: "Failed to delete performance" },
      { status: 500 }
    )
  }
}
