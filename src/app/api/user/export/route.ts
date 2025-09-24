import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
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

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get all user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ratings: {
          include: {
            actor: true,
            movie: true,
          },
        },
        performances: {
          include: {
            actor: true,
            movie: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      ratings: user.ratings.map(rating => ({
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
      performances: user.performances.map(performance => ({
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
        totalRatings: user.ratings.length,
        totalPerformances: user.performances.length,
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