import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

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
    console.error("Error fetching user ratings:", error)
    return NextResponse.json(
      { error: "Failed to fetch user ratings" },
      { status: 500 }
    )
  }
}


