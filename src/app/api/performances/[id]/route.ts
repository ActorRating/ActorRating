import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

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
        comment: true,
        createdAt: true,
        updatedAt: true,
        emotionalRangeDepth: true,
        characterBelievability: true,
        technicalSkill: true,
        screenPresence: true,
        chemistryInteraction: true,
        actor: { select: { id: true, name: true, imageUrl: true } },
        movie: { select: { id: true, title: true, year: true, director: true } },
      },
    })

    if (!performance) {
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params
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
        user: {
          select: {
            email: true,
          },
        },
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params
    await prisma.performance.delete({
      where: {
        id: id,
      },
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