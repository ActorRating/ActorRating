import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createServerClient } from "@supabase/ssr"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("=== ACTOR USER RATING API CALLED ===")
  
  try {
    // Simple Supabase client setup
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // No-op for API routes
          },
        },
      }
    )
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log("Actor user rating - Session status:", { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id,
      error: sessionError?.message 
    })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: actorId } = await params
    const userId = session.user.id

    console.log("Fetching ratings for actor:", actorId, "user:", userId)

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
    
    return NextResponse.json(
      { 
        error: "Failed to fetch user ratings", 
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}