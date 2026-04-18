export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"

export async function GET(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get export history (placeholder for now)
    const exports: any[] = []

    return NextResponse.json({ exports })
  } catch (error) {
    console.error("Export GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    })
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [ratings, performances] = await Promise.all([
      prisma.rating.findMany({
        where: { userId },
        include: { actor: true, movie: true },
      }),
      prisma.performance.findMany({
        where: { userId, movie: { is: { isFeaturette: false } } },
        include: { actor: true, movie: true },
      }),
    ])

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: dbUser.id,
        email: dbUser.email,
      },
      ratings: ratings.map(rating => ({
        id: rating.id,
        actorName: rating.actor.name,
        movieTitle: rating.movie.title,
        movieYear: rating.movie.year,
        emotionalRangeDepth: rating.emotionalRangeDepth,
        characterBelievability: rating.characterBelievability,
        technicalSkill: rating.technicalSkill,
        screenPresence: rating.screenPresence,
        chemistryInteraction: rating.chemistryInteraction,
        weightedScore: rating.weightedScore,
        comment: rating.comment,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
      })),
      performances: performances.map(performance => ({
        id: performance.id,
        actorName: performance.actor.name,
        movieTitle: performance.movie.title,
        movieYear: performance.movie.year,
        emotionalRangeDepth: performance.emotionalRangeDepth,
        characterBelievability: performance.characterBelievability,
        technicalSkill: performance.technicalSkill,
        screenPresence: performance.screenPresence,
        chemistryInteraction: performance.chemistryInteraction,
        comment: performance.comment,
        createdAt: performance.createdAt,
        updatedAt: performance.updatedAt,
      })),
      metadata: {
        totalRatings: ratings.length,
        totalPerformances: performances.length,
        exportFormat: "JSON",
        exportVersion: "1.0",
        kvkkCompliant: true,
      },
    }

    // Convert to JSON string
    const jsonData = JSON.stringify(exportData, null, 2)

    // Return as downloadable file
    return new NextResponse(jsonData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="actorrating-data-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Export POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 