export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isDevMode, getDevUser } from "@/lib/devAuth"
import { getAuthenticatedUserId } from "@/lib/authUser"

export async function GET(_request: NextRequest) {
  try {
    if (isDevMode) {
      const devUser = getDevUser()
      if (devUser) {
        return NextResponse.json([])
      }
    }

    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const ratings = await prisma.rating.findMany({
      where: {
        userId,
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

