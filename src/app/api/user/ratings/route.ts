import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  console.log("=== USER RATINGS API CALLED ===")
  
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
    
    // Get user (more reliable than getSession for API routes)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log("User ratings - Auth status:", { 
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)

    console.log("Fetching ratings for user:", userId)

    const items = await prisma.rating.findMany({
      where: {
        userId: userId,
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
      take: limit,
    })

    console.log("Found", items.length, "ratings")

    return NextResponse.json({ items, nextCursor: null })
  } catch (error) {
    console.error("=== USER RATINGS API ERROR ===")
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
        error: "Failed to fetch ratings", 
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}