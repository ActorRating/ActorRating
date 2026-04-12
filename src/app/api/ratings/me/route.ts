export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClientFromRequest } from "@/lib/supabaseRequestClient"
import { prisma } from "@/lib/prisma"
import { isDevMode, getDevUser } from "@/lib/devAuth"

export async function GET(request: NextRequest) {
  try {
    // Development mode: bypass auth
    if (isDevMode) {
      const devUser = getDevUser()
      if (devUser) {
        // Return empty array in dev mode
        return NextResponse.json([])
      }
    }
    
    const supabase = createSupabaseServerClientFromRequest(request)
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const ratings = await prisma.rating.findMany({
      where: {
        userId: user.id,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            slug: true,
          },
        },
        movie: {
          select: {
            id: true,
            title: true,
            year: true,
            director: true,
            slug: true,
            posterUrl: true,
          },
        },
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: 50,
    })

    return NextResponse.json(ratings)
  } catch (error) {
    console.error("Error fetching user ratings:", error)
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    )
  }
}

