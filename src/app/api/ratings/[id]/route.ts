export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { makeCacheKey } from "@/lib/cache"
import { createSupabaseServerClientFromRequest } from "@/lib/supabaseRequestClient"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rating = await prisma.rating.findUnique({
      where: {
        id: id,
      },
      include: {
        actor: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
        movie: {
          select: {
            title: true,
            year: true,
            director: true,
          },
        },
      },
    })

    if (!rating) {
      return NextResponse.json(
        { error: "Rating not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(rating)
  } catch (error) {
    console.error("Error fetching rating:", error)
    return NextResponse.json(
      { error: "Failed to fetch rating" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServerClientFromRequest(request)
    
    const { data: { session } } = await supabase.auth.getSession()
    
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

    // Calculate weighted score
    const weightedScore = 
      emotionalRangeDepth * 0.25 +
      characterBelievability * 0.25 +
      technicalSkill * 0.20 +
      screenPresence * 0.15 +
      chemistryInteraction * 0.15

    const shareScore = Math.round(
      emotionalRangeDepth * 0.25 +
      characterBelievability * 0.25 +
      technicalSkill * 0.20 +
      screenPresence * 0.15 +
      chemistryInteraction * 0.15
    )

    const rating = await prisma.rating.update({
      where: {
        id: id,
      },
      data: {
        emotionalRangeDepth,
        characterBelievability,
        technicalSkill,
        screenPresence,
        chemistryInteraction,
        weightedScore,
        shareScore,
        comment,
      },
      include: {
        actor: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
        movie: {
          select: {
            title: true,
            year: true,
            director: true,
          },
        },
      },
    })

    // No per-rating revalidatePath — reduces ISR writes; client updates state; /r/[slug] uses revalidate: 3600
    return NextResponse.json(rating)
  } catch (error) {
    console.error("Error updating rating:", error)
    return NextResponse.json(
      { error: "Failed to update rating" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServerClientFromRequest(request)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params
    await prisma.rating.delete({
      where: {
        id: id,
      },
    })

    return NextResponse.json({ message: "Rating deleted successfully" })
  } catch (error) {
    console.error("Error deleting rating:", error)
    return NextResponse.json(
      { error: "Failed to delete rating" },
      { status: 500 }
    )
  }
} 