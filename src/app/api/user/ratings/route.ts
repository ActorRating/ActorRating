import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { prisma } from "@/lib/prisma"
// Removed NextAuth imports - using Supabase Auth

export async function GET(request: NextRequest) {
  console.log("=== USER RATINGS API CALLED ===")
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
    console.log("User ratings - Request cookies:", cookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log("User ratings - Session check:", { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id,
      sessionError: sessionError?.message,
      cookieCount: cookies.length
    })
    
    if (!session?.user?.id) {
      console.log("User ratings - No valid session found")
      return NextResponse.json(
        { error: "Authentication required. Please sign in to view your ratings." },
        { status: 401 }
      )
    }
    
    console.log("User ratings - Authenticated user found:", session.user.id)

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get("limit")
    const cursor = searchParams.get("cursor") || undefined
    const limit = Math.min(Math.max(parseInt(limitParam || "10", 10) || 10, 1), 50)

    const items = await prisma.rating.findMany({
      where: {
        userId: session.user.id,
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
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })

    let nextCursor: string | null = null
    if (items.length > limit) {
      const nextItem = items.pop()!
      nextCursor = nextItem.id
    }

    return NextResponse.json({ items, nextCursor })
  } catch (error) {
    console.error("=== USER RATINGS API ERROR ===")
    console.error("Error fetching user ratings:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    })
    
    return NextResponse.json(
      { 
        error: "Failed to fetch ratings. Please try again.", 
        debug: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 