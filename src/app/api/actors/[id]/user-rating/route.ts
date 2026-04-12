export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSupabaseServerClientFromRequest } from "@/lib/supabaseRequestClient"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("=== ACTOR USER RATING API CALLED ===")
  
  try {
    const supabase = createSupabaseServerClientFromRequest(request)
    
    // Get user (more reliable than getSession for API routes)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log("Actor user rating - Auth status:", { 
      hasUser: !!user, 
      userId: user?.id,
      error: userError?.message 
    })
    
    // Development bypass for localhost only
    let userId = user?.id
    if (!userId && process.env.NODE_ENV === 'development') {
      const host = request.headers.get('host')
      if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
        userId = `dev-user-${Date.now()}`
        console.log("🚧 Development bypass activated for localhost:", userId)
      }
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: actorIdOrSlug } = await params

    console.log("Fetching ratings for actor (slug or ID):", actorIdOrSlug, "user:", userId)

    // First, resolve the slug to an actual actor ID
    let actorId = actorIdOrSlug
    
    // Check if it's a slug (not a UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorIdOrSlug)
    
    if (!isUUID) {
      // It's a slug, need to resolve to UUID
      const actor = await prisma.actor.findUnique({
        where: { slug: actorIdOrSlug },
        select: { id: true }
      })
      
      if (!actor) {
        console.log("Actor not found for slug:", actorIdOrSlug)
        return NextResponse.json([], { status: 200 }) // Return empty array if actor not found
      }
      
      actorId = actor.id
      console.log("Resolved slug to actor ID:", actorId)
    }

    console.log("Fetching ratings for actor ID:", actorId, "user:", userId)

    const userRatings = await prisma.rating.findMany({
      where: {
        actorId: actorId,
        userId: userId,
      },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            year: true,
            director: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      }
    })

    console.log("Found", userRatings.length, "actor ratings")

    return NextResponse.json(userRatings)
  } catch (error) {
    console.error("=== ACTOR USER RATING API ERROR ===")
    console.error("Full error:", error)
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
      
      // Check for specific Prisma errors
      if (error.message.includes('P2002') || error.message.includes('Unique constraint')) {
        return NextResponse.json({ error: "Database constraint violation" }, { status: 400 })
      }
      if (error.message.includes('P2025') || error.message.includes('Record to update not found')) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 })
      }
      if (error.message.includes('P1001') || error.message.includes('Can\'t reach database')) {
        return NextResponse.json({ error: "Database connection failed" }, { status: 503 })
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to fetch user ratings", 
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}