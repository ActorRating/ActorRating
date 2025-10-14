import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createServerClient } from "@supabase/ssr"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("=== ACTOR USER RATING API CALLED ===")
  console.log("Request URL:", request.url)
  
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    
    // Debug cookies
    const cookies = request.cookies.getAll()
    console.log("Actor user rating - Request cookies:", cookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log("Actor user rating - Session check:", { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id,
      sessionError: sessionError?.message,
      cookieCount: cookies.length
    })
    
    if (!session?.user?.id) {
      console.log("Actor user rating - No valid session found")
      return NextResponse.json(
        { error: "Authentication required. Please sign in to view your ratings." },
        { status: 401 }
      )
    }
    
    console.log("Actor user rating - Authenticated user found:", session.user.id)

    const { id: actorId } = await params
    const userId = session.user.id

    // Find all ratings for this actor by the current user
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

    return NextResponse.json(userRatings)
  } catch (error) {
    console.error("=== ACTOR USER RATING API ERROR ===")
    console.error("Error fetching actor user ratings:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    })
    
    return NextResponse.json(
      { 
        error: "Failed to fetch user ratings. Please try again.", 
        debug: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}


