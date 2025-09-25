import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { prisma } from "@/lib/prisma"
import { getServerSession, authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

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
    console.error("Error fetching user ratings:", error)
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    )
  }
} 