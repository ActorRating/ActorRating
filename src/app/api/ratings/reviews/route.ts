export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Public micro-reviews for a performance (signed-in ratings with non-empty, non-hidden comments).
 */
export async function GET(request: NextRequest) {
  try {
    const actorId = request.nextUrl.searchParams.get("actorId")?.trim()
    const movieId = request.nextUrl.searchParams.get("movieId")?.trim()
    if (!actorId || !movieId) {
      return NextResponse.json(
        { error: "actorId and movieId are required" },
        { status: 400 },
      )
    }

    const takeRaw = Number(request.nextUrl.searchParams.get("limit") ?? "20")
    const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 50) : 20

    const reviews = await prisma.rating.findMany({
      where: {
        actorId,
        movieId,
        userId: { not: null },
        commentHidden: false,
        comment: { not: null },
        NOT: { comment: "" },
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        comment: true,
        isSpoiler: true,
        weightedScore: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      reviews: reviews
        .filter((r) => Boolean(r.comment?.trim()))
        .map((r) => ({
          id: r.id,
          comment: r.comment!,
          isSpoiler: r.isSpoiler,
          score: Number((r.weightedScore / 10).toFixed(1)),
          createdAt: r.createdAt.toISOString(),
          userId: r.userId,
          username: r.user?.username ?? null,
          displayName: r.user?.username
            ? `@${r.user.username}`
            : r.user?.name?.trim() || "User",
        })),
    })
  } catch (error) {
    console.error("Reviews list error:", error)
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 })
  }
}
